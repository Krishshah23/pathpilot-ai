/**
 * config/gridfs.js — MongoDB GridFS Resume File Storage
 *
 * WHY GRIDFS:
 * Render's free tier disk is ephemeral — every redeploy, restart, or spin-down
 * after 15 minutes of inactivity wipes `uploads/`. Resume PDFs need to survive
 * indefinitely, so they're stored as binary chunks inside the same MongoDB
 * Atlas cluster the app already connects to (via `MONGODB_URI`) — no new
 * service, no new env var, no new signup.
 *
 * WHY NOT store the whole file as base64 in the Resume document (the
 * stopgap this app used before)? Two reasons: (1) MongoDB documents cap out
 * at 16MB, and base64 inflates binary size by ~33% — GridFS chunks large
 * files transparently. (2) Every `Resume.find()` query pays the cost of
 * loading the full base64 blob unless you explicitly `.select()` it out
 * every time; GridFS keeps binary data in a separate collection
 * (`resumes.files` / `resumes.chunks`) that's only touched when a file is
 * actually requested.
 *
 * BUCKET NAME: 'resumes' — creates `resumes.files` (metadata) and
 * `resumes.chunks` (binary data, 255KB chunks by default) collections.
 *
 * OWNERSHIP: each uploaded file's `metadata` stores `{ userId, mimeType }`
 * at upload time, so the serving route can authorize access without an
 * extra query against the `Resume` collection.
 */

import mongoose from 'mongoose';

let bucket = null;

/**
 * Returns a singleton GridFSBucket bound to the current mongoose connection.
 * Lazily created on first use since the connection must already be open —
 * calling this before `connectDB()` resolves will throw.
 */
export function getResumeBucket() {
  if (!bucket) {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Cannot access GridFS before the MongoDB connection is open.');
    }
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'resumes' });
  }
  return bucket;
}

/**
 * Uploads a Buffer to GridFS and resolves with the new file's ObjectId.
 * @param {Buffer} buffer
 * @param {string} filename - stored for reference (e.g. original filename)
 * @param {{ userId?: string, mimeType?: string }} metadata
 * @returns {Promise<import('mongoose').Types.ObjectId>}
 */
export function uploadBufferToGridFS(buffer, filename, metadata = {}) {
  const bucket = getResumeBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: metadata.mimeType || 'application/octet-stream',
      metadata,
    });
    uploadStream.once('error', reject);
    uploadStream.once('finish', () => resolve(uploadStream.id));
    uploadStream.end(buffer);
  });
}

/**
 * Downloads a GridFS file into memory as a Buffer.
 * @param {string|import('mongoose').Types.ObjectId} fileId
 * @returns {Promise<Buffer>}
 */
export function downloadGridFSBuffer(fileId) {
  const bucket = getResumeBucket();
  const id = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  const chunks = [];
  return new Promise((resolve, reject) => {
    bucket
      .openDownloadStream(id)
      .on('data', (chunk) => chunks.push(chunk))
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Looks up a GridFS file's metadata document without downloading its content —
 * used by the serving route to check ownership/content-type before streaming.
 * @param {string|import('mongoose').Types.ObjectId} fileId
 * @returns {Promise<import('mongodb').GridFSFile|null>}
 */
export async function findGridFSFile(fileId) {
  const bucket = getResumeBucket();
  let id;
  try {
    id = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  } catch {
    return null; // malformed id string — treat as not found rather than throwing
  }
  const files = await bucket.find({ _id: id }).toArray();
  return files[0] || null;
}

/**
 * Pipes a GridFS file's content directly into an Express response stream.
 * Errors during streaming (e.g. the file was deleted mid-request) are handled
 * gracefully rather than crashing the request — this runs after headers may
 * already be sent, so it can't just throw for asyncHandler to catch.
 * @param {string|import('mongoose').Types.ObjectId} fileId
 * @param {import('express').Response} res
 */
export function pipeGridFSFileToResponse(fileId, res) {
  const bucket = getResumeBucket();
  const id = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  const downloadStream = bucket.openDownloadStream(id);
  downloadStream.on('error', () => {
    if (!res.headersSent) res.status(404);
    res.end();
  });
  downloadStream.pipe(res);
}

/**
 * Deletes a GridFS file by id — best-effort, swallows "already gone" errors.
 * @param {string|import('mongoose').Types.ObjectId} fileId
 */
export async function deleteGridFSFile(fileId) {
  if (!fileId) return;
  try {
    const bucket = getResumeBucket();
    const id = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
    await bucket.delete(id);
  } catch {
    // already deleted or never existed — fine, this is a best-effort cleanup
  }
}
