import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { resolveLegacyResumePath } from '../utils/legacyResumePath.js';

const OWNER = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const student = { _id: OWNER, role: 'student' };
const admin = { _id: OTHER, role: 'admin' };
const ownFile = `${OWNER}-1721234567890-483920.pdf`;
const otherFile = `${OTHER}-1721234567890-111111.pdf`;

describe('resolveLegacyResumePath', () => {
  const base = path.resolve('/srv/app');
  const resumesDir = path.join(base, 'uploads', 'resumes');

  it('returns the in-folder path for the owner', () => {
    expect(resolveLegacyResumePath(ownFile, student, base)).toBe(path.join(resumesDir, ownFile));
  });

  it('accepts legacy files without an extension and .docx files', () => {
    expect(() => resolveLegacyResumePath(`${OWNER}-1-2`, student, base)).not.toThrow();
    expect(() => resolveLegacyResumePath(`${OWNER}-1-2.docx`, student, base)).not.toThrow();
  });

  it('lets an admin read another user\'s file', () => {
    expect(resolveLegacyResumePath(ownFile, admin, base)).toBe(path.join(resumesDir, ownFile));
  });

  it('rejects another user\'s file with 403', () => {
    expect(() => resolveLegacyResumePath(otherFile, student, base)).toThrow(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  it.each([
    ['forward-slash traversal', `${OWNER}-x/../../../package.json`],
    ['traversal to another user\'s resume', `${OWNER}-x/../${otherFile}`],
    ['backslash traversal', `${OWNER}-x\\..\\..\\..\\package.json`],
    ['dotfile target', `${OWNER}-x/../../../.env`],
    ['bare dot-dot', '..'],
    ['non-ObjectId prefix', 'u123-1-2.pdf'],
    ['uppercase hex id', `${OWNER.toUpperCase()}-1-2.pdf`],
    ['double extension', `${OWNER}-1-2.pdf.exe`],
    ['regex metacharacters', `${OWNER}-.*-2.pdf`],
    ['empty string', ''],
  ])('rejects %s with 404 (even for admins)', (_label, name) => {
    for (const user of [student, admin]) {
      expect(() => resolveLegacyResumePath(name, user, base)).toThrow(
        expect.objectContaining({ statusCode: 404 })
      );
    }
  });

  it('rejects non-string input', () => {
    expect(() => resolveLegacyResumePath(undefined, student, base)).toThrow(
      expect.objectContaining({ statusCode: 404 })
    );
  });
});

// Route-level check: Express decodes %2F / %5C inside :filename AFTER routing,
// which is what made the original handler exploitable. This mounts the helper
// the same way app.js does and sends raw encoded paths over HTTP.
describe('legacy resume route (encoded traversal over HTTP)', () => {
  let tmp;
  let app;

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-legacy-'));
    fs.mkdirSync(path.join(tmp, 'uploads', 'resumes'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'uploads', 'resumes', ownFile), 'OWN-RESUME');
    fs.writeFileSync(path.join(tmp, 'uploads', 'resumes', otherFile), 'OTHER-RESUME');
    fs.writeFileSync(path.join(tmp, 'package.json'), 'SECRET-SOURCE');

    app = express();
    app.get('/uploads/resumes/:filename', (req, res, next) => {
      try {
        const absPath = resolveLegacyResumePath(req.params.filename, student, tmp);
        if (!fs.existsSync(absPath)) return res.status(404).end();
        return res.sendFile(absPath);
      } catch (err) {
        return next(err);
      }
    });
    // eslint-disable-next-line no-unused-vars
    app.use((err, _req, res, _next) => res.status(err.statusCode || 500).send(err.message));
  });

  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('still serves the owner\'s own file', async () => {
    const res = await request(app).get(`/uploads/resumes/${ownFile}`);
    expect(res.status).toBe(200);
    // .pdf is served as application/pdf, so supertest exposes it as a Buffer
    expect(Buffer.from(res.body).toString()).toBe('OWN-RESUME');
  });

  it.each([
    ['%2F to server root', `/uploads/resumes/${OWNER}-x%2F..%2F..%2F..%2Fpackage.json`],
    ['%2F to other user', `/uploads/resumes/${OWNER}-x%2F..%2F${otherFile}`],
    ['%5C to server root', `/uploads/resumes/${OWNER}-x%5C..%5C..%5C..%5Cpackage.json`],
  ])('blocks %s', async (_label, url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(404);
    expect(res.text).not.toMatch(/SECRET-SOURCE|OTHER-RESUME/);
  });
});
