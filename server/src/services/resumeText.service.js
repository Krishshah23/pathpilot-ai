import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { ApiError } from '../utils/ApiError.js';

/*
  Extracts raw text from an uploaded resume file. Text extraction is a utility
  concern (not ML), so it lives in Node; the extracted text is then sent to the
  Django service for the actual intelligence (skills/health/suggestions).
*/

// pdf-parse inserts page separators like "-- 1 of 3 --"; strip them.
const PAGE_MARKER = /\n?-- \d+ of \d+ --\n?/g;

async function fromPdf(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const { text } = await parser.getText();
    return (text || '').replace(PAGE_MARKER, '\n');
  } finally {
    await parser.destroy?.();
  }
}

async function fromDocx(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return value || '';
}

/**
 * Reads a stored resume file and returns its plain text.
 * @param {string} absPath  absolute path to the file on disk
 * @param {string} originalName  original filename (used to detect type)
 */
export async function extractResumeText(absPath, originalName = '') {
  const ext = path.extname(originalName || absPath).toLowerCase();
  const buffer = await fs.readFile(absPath);

  try {
    if (ext === '.pdf') return normalize(await fromPdf(buffer));
    if (ext === '.docx') return normalize(await fromDocx(buffer));
    if (ext === '.doc') {
      // Legacy .doc isn't reliably parseable without extra tooling.
      throw ApiError.badRequest('Please upload a PDF or DOCX resume (.doc is not supported).');
    }
    throw ApiError.badRequest('Unsupported resume format.');
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.badRequest('Could not read text from this file. Try a text-based PDF.');
  }
}

/** Collapse excessive whitespace while preserving line breaks for sectioning. */
function normalize(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
