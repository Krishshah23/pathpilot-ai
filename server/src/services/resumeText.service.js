import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import pdfjsLib from 'pdfjs-dist/build/pdf.js';
import mammoth from 'mammoth';
import { ApiError } from '../utils/ApiError.js';

/*
  Extracts raw text from an uploaded resume file. Text extraction is a utility
  concern (not ML), so it lives in Node; the extracted text is then sent to the
  Django service for the actual intelligence (skills/health/suggestions).
*/

// pdf-parse inserts page separators like "-- 1 of 3 --"; strip them.
const PAGE_MARKER = /\n?-- \d+ of \d+ --\n?/g;

/* fromPdf is defined later (extended version that also scans text) */

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

/**
 * Also scan extracted plain text for URL-like tokens that may have been
 * soft-wrapped by PDF layout (line breaks inside URLs). We conservatively
 * re-join newline breaks that occur between URL-safe characters and then
 * run a URL/domain regex to pull candidates.
 */
function extractUrlsFromText(text) {
  if (!text) return [];
  const seeds = ['http://', 'https://', 'www.'];
  const urlChars = /[A-Za-z0-9\-._~:\/?#\[\]@!$&'()*+,;=%]/;
  const found = new Set();
  const lower = text.toLowerCase();

  for (const seed of seeds) {
    let idx = lower.indexOf(seed);
    while (idx !== -1) {
      // Work on a local window to avoid accidentally swallowing unrelated text
      const maxWindow = Math.min(text.length, idx + 300);
      const window = text.slice(idx, maxWindow);
      const collapsed = window.replace(/[\s\n\r]+/g, '');

      let m = null;
      if (seed.startsWith('http') || seed === 'www.') {
        // Look for full http(s) or www URL in the collapsed window
        m = collapsed.match(/https?:\/\/[A-Za-z0-9\-._~:\/?#\[\]@!$&'()*+,;=%]+/i) || collapsed.match(/www\.[A-Za-z0-9\-._~:\/?#\[\]@!$&'()*+,;=%]+/i);
      } else if (seed.includes('linkedin')) {
        m = collapsed.match(/linkedin\.com\/[A-Za-z0-9\-._~:\/?#@!$&'()*+,;=%]+/i);
      } else if (seed.includes('github')) {
        m = collapsed.match(/github\.com\/[A-Za-z0-9\-._~:\/?#@!$&'()*+,;=%]+/i);
      }

      if (m && m[0]) {
        let final = m[0];
        if (!final.startsWith('http')) {
          if (final.startsWith('www.')) final = 'http://' + final;
          else final = 'https://' + final;
        }
        // Trim trailing punctuation
        final = final.replace(/[.,;]+$/g, '');
        // If the collapsed window accidentally joined an adjacent sentence
        // like '...Portfolio: www.example.com/port\nfolio', remove any
        // uppercase-word + ':' suffix that slipped in during collapse.
        const cut = final.search(/[A-Z][a-z]+:/);
        if (cut > 0) final = final.slice(0, cut);
        found.add(final);
      }

      idx = lower.indexOf(seed, idx + seed.length);
    }
  }

  return Array.from(found);
}

// Extend fromPdf to also include text-scanned URLs when annotation links are absent
// coordinate-aware text layout sorter
async function extractPdfTextWithLayout(buffer) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const items = textContent.items.map(item => {
      // transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const tx = item.transform;
      return {
        str: item.str,
        x: tx[4],
        y: tx[5],
        height: tx[3]
      };
    });

    if (items.length === 0) continue;

    // Detect if page has two columns.
    // Find min/max X coordinates
    let minX = Infinity;
    let maxX = -Infinity;
    items.forEach(it => {
      if (it.str.trim()) {
        if (it.x < minX) minX = it.x;
        if (it.x > maxX) maxX = it.x;
      }
    });

    const midX = minX + (maxX - minX) / 2;
    // Check if items cluster into two columns: left (x < midX) and right (x > midX)
    let leftCount = 0;
    let rightCount = 0;
    items.forEach(it => {
      if (it.str.trim()) {
        if (it.x < midX - 20) leftCount++;
        if (it.x > midX + 20) rightCount++;
      }
    });

    const isTwoColumn = leftCount > 20 && rightCount > 20;

    let sortedItems = [];
    if (isTwoColumn) {
      // Two-column sorting: left column items, then right column items.
      // Within each column, sort by y descending (top to bottom), then by x ascending.
      const leftCol = items.filter(it => it.x < midX);
      const rightCol = items.filter(it => it.x >= midX);

      const sortByCoord = (a, b) => {
        if (Math.abs(a.y - b.y) < 5) return a.x - b.x;
        return b.y - a.y;
      };

      leftCol.sort(sortByCoord);
      rightCol.sort(sortByCoord);

      sortedItems = [...leftCol, ...rightCol];
    } else {
      // Single column sorting: sort by y descending, then by x ascending.
      sortedItems = [...items].sort((a, b) => {
        if (Math.abs(a.y - b.y) < 5) return a.x - b.x;
        return b.y - a.y;
      });
    }

    // Reconstruct lines
    let pageText = '';
    let currentY = -1;
    for (const item of sortedItems) {
      if (!item.str.trim() && item.str !== ' ') continue;
      if (currentY === -1) {
        pageText += item.str;
        currentY = item.y;
      } else if (Math.abs(item.y - currentY) < 5) {
        // same line
        pageText += (pageText.endsWith(' ') || item.str.startsWith(' ') ? '' : ' ') + item.str;
      } else {
        // new line
        pageText += '\n' + item.str;
        currentY = item.y;
      }
    }

    fullText += pageText + '\n\n';
  }

  return fullText;
}

// Extend fromPdf to also include text-scanned URLs when annotation links are absent
async function fromPdf(buffer) {
  try {
    // Reconstruct text using coordinate-aware logic
    const text = await extractPdfTextWithLayout(buffer);
    const cleaned = (text || '').replace(PAGE_MARKER, '\n');
    
    // Also extract any URI link annotations from the PDF
    const annLinks = await extractPdfLinks(buffer);
    const textLinks = extractUrlsFromText(cleaned);
    const all = Array.from(new Set([...(annLinks || []), ...(textLinks || [])]));
    
    return { text: cleaned, links: all };
  } catch (err) {
    // fallback to basic pdf-parse if coordinate extraction fails
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const { text } = await parser.getText();
      const cleaned = (text || '').replace(PAGE_MARKER, '\n');
      const annLinks = await extractPdfLinks(buffer);
      const textLinks = extractUrlsFromText(cleaned);
      const all = Array.from(new Set([...(annLinks || []), ...(textLinks || [])]));
      return { text: cleaned, links: all };
    } finally {
      await parser.destroy?.();
    }
  }
}

export { extractUrlsFromText };

