/**
 * scripts/migrateResumesToGridFS.js — One-Time Backfill: Disk/Base64 → GridFS
 *
 * WHY THIS EXISTS:
 * Before this migration, resume files lived on Render's ephemeral disk
 * (wiped on every redeploy/restart/spin-down) with an inconsistent base64
 * backup in MongoDB (broken for records created via the main
 * `/api/resume/analyze` pipeline — see the `fs` import bug this migration's
 * commit also fixes). Every `Resume` document created going forward stores
 * its file in MongoDB GridFS instead (see config/gridfs.js). This script
 * backfills EXISTING documents so old uploads aren't orphaned.
 *
 * WHAT IT DOES, per Resume document missing a `fileId`:
 *   1. Prefer reading the file from local disk (uploads/resumes/<filename>,
 *      derived from the legacy fileUrl) — this only works if run BEFORE the
 *      next Render restart wipes the disk, so run it promptly after deploying.
 *   2. Fall back to the document's `fileBase64` field if disk read fails/misses.
 *   3. Skip (and report) documents where neither source has usable data —
 *      these were already unrecoverable before this migration.
 *   4. Upload the recovered buffer to GridFS, set `fileId` + a new `fileUrl`
 *      pointing at `/api/resume/file/<fileId>`.
 *   5. If the user's current `profile.resumeUrl` still points at this
 *      document's OLD fileUrl, update it to the new one too.
 *
 * IDEMPOTENT: only touches documents where `fileId` is not already set, so
 * it's safe to run multiple times (e.g. once locally now, once again on
 * Render right after deploying, to catch anything the first pass missed).
 *
 * USAGE:
 *   node src/scripts/migrateResumesToGridFS.js
 *   (or add a "migrate:gridfs" script in package.json for convenience)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Resume } from '../models/Resume.js';
import { User } from '../models/User.js';
import { uploadBufferToGridFS } from '../config/gridfs.js';

/** Reads the legacy on-disk copy of a resume, if it still exists. */
async function readFromDisk(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith('/uploads/resumes/')) return null;
  const filename = fileUrl.split('/').pop();
  const absPath = path.join(process.cwd(), 'uploads', 'resumes', filename);
  try {
    return await fs.readFile(absPath);
  } catch {
    return null; // file already gone (ephemeral disk wipe) — try base64 fallback
  }
}

async function migrate() {
  await connectDB();

  const candidates = await Resume.find({
    $or: [{ fileId: null }, { fileId: { $exists: false } }],
  }).select('+fileBase64'); // excluded by default (see Resume.js) — this script needs it

  console.log(`Found ${candidates.length} resume document(s) without a GridFS fileId.\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const resume of candidates) {
    const oldFileUrl = resume.fileUrl;

    let buffer = await readFromDisk(oldFileUrl);
    let source = 'disk';

    if (!buffer && resume.fileBase64) {
      try {
        buffer = Buffer.from(resume.fileBase64, 'base64');
        source = 'base64';
      } catch {
        buffer = null;
      }
    }

    if (!buffer || buffer.length === 0) {
      console.warn(`  SKIP  ${resume._id} — no recoverable file (disk gone, no base64 backup).`);
      skipped++;
      continue;
    }

    try {
      const fileId = await uploadBufferToGridFS(buffer, resume.originalName || 'resume.pdf', {
        userId: resume.user.toString(),
        mimeType: resume.mimeType || 'application/pdf',
      });
      const newFileUrl = `/api/resume/file/${fileId}`;

      resume.fileId = fileId;
      resume.fileUrl = newFileUrl;
      await resume.save();

      // Keep the user's active pointer in sync if it was pointing at this doc's old URL
      if (oldFileUrl) {
        await User.updateOne(
          { _id: resume.user, 'profile.resumeUrl': oldFileUrl },
          { $set: { 'profile.resumeUrl': newFileUrl } }
        );
      }

      console.log(`  OK    ${resume._id} — recovered from ${source}, ${buffer.length} bytes → GridFS ${fileId}`);
      migrated++;
    } catch (err) {
      console.error(`  FAIL  ${resume._id} — GridFS upload failed:`, err.message);
      failed++;
    }
  }

  console.log(`\nDone. Migrated: ${migrated}  Skipped (unrecoverable): ${skipped}  Failed: ${failed}`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

migrate().catch((err) => {
  console.error('Migration crashed:', err);
  process.exit(1);
});
