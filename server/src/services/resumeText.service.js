/**
 * services/resumeText.service.js — Document Text & Link Extraction Utility
 *
 * PURPOSE & ARCHITECTURE:
 * Extracts plain text and hyperlink annotations from uploaded PDF and DOCX files.
 * Text extraction is a utility function running in Node.js before forwarding
 * structured text to the Django ML service for parsing and analysis.
 *
 * ADVANCED EXTRACTION FEATURES:
 * 1. COORDINATE-AWARE LAYOUT SORTING (`extractPdfTextWithLayout`):
 *    Uses pdfjs-dist transform matrices (`[scaleX, skewX, skewY, scaleY, translateX, translateY]`)
 *    to detect multi-column layouts (e.g. 2-column resumes). Items are sorted top-to-bottom
 *    within columns rather than strictly reading left-to-right across columns.
 * 2. LINK ANNOTATION EXTRACTION (`extractPdfLinks`):
 *    Reads PDF URI annotation metadata (extracts actual hyperlinked URLs for GitHub/LinkedIn
 *    even when the visible text is "Portfolio" or "GitHub Profile").
 * 3. REGEX URL FALLBACK (`extractUrlsFromText`):
 *    Scans plain text for URL tokens wrapped across line breaks.
 */

import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import pdfjsLib from 'pdfjs-dist/build/pdf.js';
import mammoth from 'mammoth';
import { ApiError } from '../utils/ApiError.js';

// Regex matching pdf-parse page boundary markers (e.g., "-- 1 of 3 --")
const PAGE_MARKER = /\n?-- \d+ of \d+ --\n?/g;

/**
 * Extracts raw plain text from DOCX files using mammoth.
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<string>} Extracted raw text
 */
async function fromDocx(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return value || '';
}

/**
 * Main entry point: extracts cleaned text + hyperlinks from an in-memory resume file.
 * Takes a Buffer directly (not a disk path) — the upload middleware keeps resume
 * files in memory only (Render's disk is ephemeral), so this never touches disk.
 *
 * @param {Buffer} buffer - Raw file content
 * @param {string} [originalName=''] - Original filename, used only for extension detection
 * @returns {Promise<{text: string, links: Array<string>}>} Extracted text and array of URLs
 */
export async function extractResumeText(buffer, originalName = '') {
  const ext = path.extname(originalName).toLowerCase();

  try {
    if (ext === '.pdf') {
      const res = await fromPdf(buffer);
      return { text: normalize(res.text), links: res.links || [] };
    }
    if (ext === '.docx') return { text: normalize(await fromDocx(buffer)), links: [] };
    if (ext === '.doc') {
      throw ApiError.badRequest('Please upload a PDF or DOCX resume (.doc is not supported).');
    }
    throw ApiError.badRequest('Unsupported resume format.');
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.badRequest('Could not read text from this file. Try a text-based PDF.');
  }
}

/** Normalizes line endings and collapses redundant empty lines while preserving section breaks. */
function normalize(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts PDF URI annotations (interactive hyperlinks embedded in the document).
 * @param {Buffer} buffer
 * @returns {Promise<Array<string>>} List of unique URL strings
 */
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
          if (a.url) uris.push(a.url);
          if (a.action && typeof a.action === 'string') uris.push(a.action);
        }
      }
    }
  } catch (err) {
    // Non-fatal — link extraction is best-effort
  }
  return Array.from(new Set(uris));
}

/**
 * Scans plain text for URL tokens, repairing line-wrapped URLs.
 * @param {string} text
 * @returns {Array<string>} Extracted URL strings
 */
function extractUrlsFromText(text) {
  if (!text) return [];
  const seeds = ['http://', 'https://', 'www.'];
  const found = new Set();
  const lower = text.toLowerCase();

  for (const seed of seeds) {
    let idx = lower.indexOf(seed);
    while (idx !== -1) {
      const maxWindow = Math.min(text.length, idx + 300);
      const window = text.slice(idx, maxWindow);
      const collapsed = window.replace(/[\s\n\r]+/g, '');

      let m = null;
      if (seed.startsWith('http') || seed === 'www.') {
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
        final = final.replace(/[.,;]+$/g, '');
        const cut = final.search(/[A-Z][a-z]+:/);
        if (cut > 0) final = final.slice(0, cut);
        found.add(final);
      }

      idx = lower.indexOf(seed, idx + seed.length);
    }
  }

  return Array.from(found);
}

/**
 * Coordinate-aware PDF text extraction algorithm.
 * Groups items by X and Y coordinates to preserve column reading order.
 * @param {Buffer} buffer
 * @returns {Promise<string>} Sorted full text
 */
async function extractPdfTextWithLayout(buffer) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const items = textContent.items.map((item) => {
      const tx = item.transform;
      return {
        str: item.str,
        x: tx[4],
        y: tx[5],
        height: tx[3],
      };
    });

    if (items.length === 0) continue;

    // Determine min and max X coordinates to check for 2-column layout
    let minX = Infinity;
    let maxX = -Infinity;
    items.forEach((it) => {
      if (it.str.trim()) {
        if (it.x < minX) minX = it.x;
        if (it.x > maxX) maxX = it.x;
      }
    });

    const midX = minX + (maxX - minX) / 2;
    let leftCount = 0;
    let rightCount = 0;
    items.forEach((it) => {
      if (it.str.trim()) {
        if (it.x < midX - 20) leftCount++;
        if (it.x > midX + 20) rightCount++;
      }
    });

    const isTwoColumn = leftCount > 20 && rightCount > 20;

    let sortedItems = [];
    if (isTwoColumn) {
      // Sort left column top-to-bottom, then right column top-to-bottom
      const leftCol = items.filter((it) => it.x < midX);
      const rightCol = items.filter((it) => it.x >= midX);

      const sortByCoord = (a, b) => {
        if (Math.abs(a.y - b.y) < 5) return a.x - b.x;
        return b.y - a.y; // Y coordinate decreases going down the page
      };

      leftCol.sort(sortByCoord);
      rightCol.sort(sortByCoord);

      sortedItems = [...leftCol, ...rightCol];
    } else {
      // Single-column sort: top-to-bottom (y desc), then left-to-right (x asc)
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
        pageText += (pageText.endsWith(' ') || item.str.startsWith(' ') ? '' : ' ') + item.str;
      } else {
        pageText += '\n' + item.str;
        currentY = item.y;
      }
    }

    fullText += pageText + '\n\n';
  }

  return fullText;
}

/**
 * Extracts PDF text using layout-aware extraction with fallback to standard pdf-parse.
 * @param {Buffer} buffer
 * @returns {Promise<{text: string, links: Array<string>}>}
 */
async function fromPdf(buffer) {
  try {
    const text = await extractPdfTextWithLayout(buffer);
    const cleaned = (text || '').replace(PAGE_MARKER, '\n');

    const annLinks = await extractPdfLinks(buffer);
    const textLinks = extractUrlsFromText(cleaned);
    const all = Array.from(new Set([...(annLinks || []), ...(textLinks || [])]));

    return { text: cleaned, links: all };
  } catch (err) {
    // Fallback to pdf-parse if coordinate-based sorting encounters an issue
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
