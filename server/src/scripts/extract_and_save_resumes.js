#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractResumeText } from '../services/resumeText.service.js';

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, '..', '..', '..');
  const uploads = path.resolve(repoRoot, 'server', 'uploads', 'resumes');
  const outDir = path.resolve(repoRoot, 'ai-service', 'ml', 'tests', 'resume_samples');
  await fs.mkdir(outDir, { recursive: true });
  const files = await fs.readdir(uploads);
  for (const f of files) {
    if (!f.endsWith('.pdf') && !f.endsWith('.docx')) continue;
    const abs = path.join(uploads, f);
    try {
      const { text, links } = await extractResumeText(abs, f);
      const out = { filename: f, text: text.slice(0, 10000), links };
      const cleanName = f.replace(/[^a-z0-9.]/gi, '_');
      await fs.writeFile(path.join(outDir, cleanName + '.json'), JSON.stringify(out, null, 2));
      console.log('Saved sample:', f);
    } catch (err) {
      console.warn('Failed to extract', f, err.message || err);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
