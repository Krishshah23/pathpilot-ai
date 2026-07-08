import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
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
    const cleaned = (text || '').replace(PAGE_MARKER, '\n');
    // Also extract any URI link annotations from the PDF
    const links = await extractPdfLinks(buffer);
    return { text: cleaned, links };
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
    if (ext === '.pdf') {
      const res = await fromPdf(buffer);
      return { text: normalize(res.text), links: res.links || [] };
    }
    if (ext === '.docx') return { text: normalize(await fromDocx(buffer)), links: [] };
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

async function extractPdfLinks(buffer) {
  const uris = [];
  try {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const ann = await page.getAnnotations();
      for (const a of ann) {
        if (a.subtype === 'Link') {
          // pdf.js uses 'url' for external URI actions
          if (a.url) uris.push(a.url);
          // sometimes the action is nested in dest / action fields
          if (a.action && typeof a.action === 'string') uris.push(a.action);
        }
      }
    }
  } catch (err) {
    // Don't fail the extraction for link errors — links are a best-effort
  }
  return Array.from(new Set(uris));
}
