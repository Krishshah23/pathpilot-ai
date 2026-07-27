/**
 * services/resumeBuilderExport.service.js — Resume Builder Export Pipeline
 *
 * Three export formats, all deriving from the same ResumeBuilder document:
 *   - PDF  via @react-pdf/renderer, rendered server-side (renderToBuffer) — chosen
 *     over Puppeteer/pdf-lib because it lets each template be defined as a small
 *     React component tree instead of a second hand-built layout engine.
 *   - DOCX via the `docx` package — structured Word document, not an HTML dump.
 *   - Text — plain-text serialization for pasting into job portal text boxes.
 *
 * NO JSX: this file runs directly under Node (no build step), so PDF templates
 * are written with React.createElement rather than JSX syntax.
 */

import React from 'react';
import { Document, Page, View, Text, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

const h = React.createElement;

// ── Shared helpers ──────────────────────────────────────────────────────────

function contactLine(contact) {
  return [contact.email, contact.phone, contact.location, contact.linkedin, contact.github, contact.website]
    .filter(Boolean)
    .join('  ·  ');
}

function dateRange(entry) {
  const end = entry.current ? 'Present' : entry.endDate;
  return [entry.startDate, end].filter(Boolean).join(' – ');
}

// ── PDF: Minimal template ────────────────────────────────────────────────────

const minimalStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#171717' },
  name: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  contact: { fontSize: 9, color: '#525252', marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#2B4C3F', marginTop: 14, marginBottom: 6, borderBottom: '1px solid #EAEAE5', paddingBottom: 3 },
  summary: { fontSize: 10, lineHeight: 1.5, color: '#171717' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  entryTitle: { fontSize: 10.5, fontWeight: 700 },
  entryMeta: { fontSize: 9, color: '#525252' },
  bullet: { fontSize: 9.5, lineHeight: 1.4, marginBottom: 2, marginLeft: 10 },
  skillsRow: { fontSize: 9.5, lineHeight: 1.6 },
  entryBlock: { marginBottom: 10 },
});

function MinimalTemplate({ doc }) {
  return h(Document, null,
    h(Page, { size: 'A4', style: minimalStyles.page },
      h(Text, { style: minimalStyles.name }, doc.contact.name || 'Your Name'),
      h(Text, { style: minimalStyles.contact }, contactLine(doc.contact)),
      doc.summary && h(View, null,
        h(Text, { style: minimalStyles.sectionTitle }, 'Summary'),
        h(Text, { style: minimalStyles.summary }, doc.summary)
      ),
      doc.experience?.length > 0 && h(View, null,
        h(Text, { style: minimalStyles.sectionTitle }, 'Experience'),
        ...doc.experience.map((e, i) => h(View, { key: i, style: minimalStyles.entryBlock },
          h(View, { style: minimalStyles.entryHeader },
            h(Text, { style: minimalStyles.entryTitle }, `${e.title}${e.company ? ' · ' + e.company : ''}`),
            h(Text, { style: minimalStyles.entryMeta }, dateRange(e))
          ),
          ...(e.bullets || []).map((b, bi) => h(Text, { key: bi, style: minimalStyles.bullet }, `•  ${b}`))
        ))
      ),
      doc.projects?.length > 0 && h(View, null,
        h(Text, { style: minimalStyles.sectionTitle }, 'Projects'),
        ...doc.projects.map((p, i) => h(View, { key: i, style: minimalStyles.entryBlock },
          h(Text, { style: minimalStyles.entryTitle }, p.title),
          ...(p.bullets || []).map((b, bi) => h(Text, { key: bi, style: minimalStyles.bullet }, `•  ${b}`))
        ))
      ),
      doc.skills?.length > 0 && h(View, null,
        h(Text, { style: minimalStyles.sectionTitle }, 'Skills'),
        h(Text, { style: minimalStyles.skillsRow }, doc.skills.join('  ·  '))
      ),
      doc.education?.length > 0 && h(View, null,
        h(Text, { style: minimalStyles.sectionTitle }, 'Education'),
        ...doc.education.map((ed, i) => h(View, { key: i, style: minimalStyles.entryHeader },
          h(Text, { style: minimalStyles.entryTitle }, `${ed.degree}${ed.institution ? ' · ' + ed.institution : ''}`),
          h(Text, { style: minimalStyles.entryMeta }, dateRange(ed))
        ))
      )
    )
  );
}

// ── PDF: Modern template (dark header band) ─────────────────────────────────

const modernStyles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#171717' },
  header: { backgroundColor: '#0C1810', padding: 28, marginBottom: 18 },
  name: { fontSize: 24, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 },
  contact: { fontSize: 9, color: '#C8DDD6' },
  body: { paddingHorizontal: 32, paddingBottom: 32 },
  sectionTitle: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: '#0C1810', marginTop: 12, marginBottom: 6 },
  divider: { height: 2, backgroundColor: '#2B4C3F', width: 28, marginBottom: 8 },
  summary: { fontSize: 10, lineHeight: 1.5 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  entryTitle: { fontSize: 10.5, fontWeight: 700 },
  entryMeta: { fontSize: 9, color: '#525252' },
  bullet: { fontSize: 9.5, lineHeight: 1.4, marginBottom: 2, marginLeft: 10 },
  skillPill: { fontSize: 9, backgroundColor: '#F0F5F3', color: '#2B4C3F', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginRight: 4, marginBottom: 4 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  entryBlock: { marginBottom: 10 },
});

function ModernTemplate({ doc }) {
  return h(Document, null,
    h(Page, { size: 'A4', style: modernStyles.page },
      h(View, { style: modernStyles.header },
        h(Text, { style: modernStyles.name }, doc.contact.name || 'Your Name'),
        h(Text, { style: modernStyles.contact }, contactLine(doc.contact))
      ),
      h(View, { style: modernStyles.body },
        doc.summary && h(View, null,
          h(Text, { style: modernStyles.sectionTitle }, 'Summary'), h(View, { style: modernStyles.divider }),
          h(Text, { style: modernStyles.summary }, doc.summary)
        ),
        doc.experience?.length > 0 && h(View, null,
          h(Text, { style: modernStyles.sectionTitle }, 'Experience'), h(View, { style: modernStyles.divider }),
          ...doc.experience.map((e, i) => h(View, { key: i, style: modernStyles.entryBlock },
            h(View, { style: modernStyles.entryHeader },
              h(Text, { style: modernStyles.entryTitle }, `${e.title}${e.company ? ' · ' + e.company : ''}`),
              h(Text, { style: modernStyles.entryMeta }, dateRange(e))
            ),
            ...(e.bullets || []).map((b, bi) => h(Text, { key: bi, style: modernStyles.bullet }, `•  ${b}`))
          ))
        ),
        doc.projects?.length > 0 && h(View, null,
          h(Text, { style: modernStyles.sectionTitle }, 'Projects'), h(View, { style: modernStyles.divider }),
          ...doc.projects.map((p, i) => h(View, { key: i, style: modernStyles.entryBlock },
            h(Text, { style: modernStyles.entryTitle }, p.title),
            ...(p.bullets || []).map((b, bi) => h(Text, { key: bi, style: modernStyles.bullet }, `•  ${b}`))
          ))
        ),
        doc.skills?.length > 0 && h(View, null,
          h(Text, { style: modernStyles.sectionTitle }, 'Skills'), h(View, { style: modernStyles.divider }),
          h(View, { style: modernStyles.skillsWrap }, ...doc.skills.map((s, i) => h(Text, { key: i, style: modernStyles.skillPill }, s)))
        ),
        doc.education?.length > 0 && h(View, null,
          h(Text, { style: modernStyles.sectionTitle }, 'Education'), h(View, { style: modernStyles.divider }),
          ...doc.education.map((ed, i) => h(View, { key: i, style: modernStyles.entryHeader },
            h(Text, { style: modernStyles.entryTitle }, `${ed.degree}${ed.institution ? ' · ' + ed.institution : ''}`),
            h(Text, { style: modernStyles.entryMeta }, dateRange(ed))
          ))
        )
      )
    )
  );
}

// ── PDF: Classic template (serif, centered header) ──────────────────────────

const classicStyles = StyleSheet.create({
  page: { padding: 44, fontFamily: 'Times-Roman', fontSize: 10.5, color: '#1a1a1a' },
  name: { fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 4, letterSpacing: 1 },
  contact: { fontSize: 9.5, color: '#3a3a3a', textAlign: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', letterSpacing: 2, marginTop: 14, marginBottom: 8 },
  hr: { borderBottom: '1px solid #1a1a1a', marginBottom: 8 },
  summary: { fontSize: 10.5, lineHeight: 1.5, textAlign: 'center' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  entryTitle: { fontSize: 11, fontWeight: 700 },
  entryMeta: { fontSize: 9.5, fontStyle: 'italic', color: '#3a3a3a' },
  bullet: { fontSize: 10, lineHeight: 1.45, marginBottom: 2, marginLeft: 12 },
  skillsRow: { fontSize: 10, textAlign: 'center', lineHeight: 1.6 },
  entryBlock: { marginBottom: 10 },
});

function ClassicTemplate({ doc }) {
  return h(Document, null,
    h(Page, { size: 'A4', style: classicStyles.page },
      h(Text, { style: classicStyles.name }, (doc.contact.name || 'Your Name').toUpperCase()),
      h(Text, { style: classicStyles.contact }, contactLine(doc.contact)),
      doc.summary && h(View, null,
        h(Text, { style: classicStyles.sectionTitle }, 'Summary'), h(View, { style: classicStyles.hr }),
        h(Text, { style: classicStyles.summary }, doc.summary)
      ),
      doc.experience?.length > 0 && h(View, null,
        h(Text, { style: classicStyles.sectionTitle }, 'Experience'), h(View, { style: classicStyles.hr }),
        ...doc.experience.map((e, i) => h(View, { key: i, style: classicStyles.entryBlock },
          h(View, { style: classicStyles.entryHeader },
            h(Text, { style: classicStyles.entryTitle }, `${e.title}${e.company ? ', ' + e.company : ''}`),
            h(Text, { style: classicStyles.entryMeta }, dateRange(e))
          ),
          ...(e.bullets || []).map((b, bi) => h(Text, { key: bi, style: classicStyles.bullet }, `–  ${b}`))
        ))
      ),
      doc.projects?.length > 0 && h(View, null,
        h(Text, { style: classicStyles.sectionTitle }, 'Projects'), h(View, { style: classicStyles.hr }),
        ...doc.projects.map((p, i) => h(View, { key: i, style: classicStyles.entryBlock },
          h(Text, { style: classicStyles.entryTitle }, p.title),
          ...(p.bullets || []).map((b, bi) => h(Text, { key: bi, style: classicStyles.bullet }, `–  ${b}`))
        ))
      ),
      doc.skills?.length > 0 && h(View, null,
        h(Text, { style: classicStyles.sectionTitle }, 'Skills'), h(View, { style: classicStyles.hr }),
        h(Text, { style: classicStyles.skillsRow }, doc.skills.join('  ·  '))
      ),
      doc.education?.length > 0 && h(View, null,
        h(Text, { style: classicStyles.sectionTitle }, 'Education'), h(View, { style: classicStyles.hr }),
        ...doc.education.map((ed, i) => h(View, { key: i, style: classicStyles.entryHeader },
          h(Text, { style: classicStyles.entryTitle }, `${ed.degree}${ed.institution ? ', ' + ed.institution : ''}`),
          h(Text, { style: classicStyles.entryMeta }, dateRange(ed))
        ))
      )
    )
  );
}

const TEMPLATES = { minimal: MinimalTemplate, modern: ModernTemplate, classic: ClassicTemplate };

/** Renders a ResumeBuilder document to a PDF Buffer using its selected template. */
export async function exportToPdf(doc) {
  const Template = TEMPLATES[doc.template] || MinimalTemplate;
  return renderToBuffer(h(Template, { doc }));
}

// ── DOCX export ──────────────────────────────────────────────────────────────

function bulletParagraphs(bullets) {
  return (bullets || []).map((b) => new Paragraph({ text: b, bullet: { level: 0 } }));
}

/** Renders a ResumeBuilder document to a DOCX Buffer (structure, not a template skin). */
export async function exportToDocx(doc) {
  const children = [
    new Paragraph({ text: doc.contact.name || 'Your Name', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: contactLine(doc.contact) }),
  ];

  if (doc.summary) {
    children.push(new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: doc.summary }));
  }

  if (doc.experience?.length) {
    children.push(new Paragraph({ text: 'Experience', heading: HeadingLevel.HEADING_2 }));
    for (const e of doc.experience) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${e.title}${e.company ? ' · ' + e.company : ''}`, bold: true }),
          new TextRun({ text: `   ${dateRange(e)}`, italics: true }),
        ],
      }));
      children.push(...bulletParagraphs(e.bullets));
    }
  }

  if (doc.projects?.length) {
    children.push(new Paragraph({ text: 'Projects', heading: HeadingLevel.HEADING_2 }));
    for (const p of doc.projects) {
      children.push(new Paragraph({ children: [new TextRun({ text: p.title, bold: true })] }));
      children.push(...bulletParagraphs(p.bullets));
    }
  }

  if (doc.skills?.length) {
    children.push(new Paragraph({ text: 'Skills', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: doc.skills.join(' · ') }));
  }

  if (doc.education?.length) {
    children.push(new Paragraph({ text: 'Education', heading: HeadingLevel.HEADING_2 }));
    for (const ed of doc.education) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${ed.degree}${ed.institution ? ' · ' + ed.institution : ''}`, bold: true }),
          new TextRun({ text: `   ${dateRange(ed)}`, italics: true }),
        ],
      }));
    }
  }

  const docxDocument = new DocxDocument({ sections: [{ children }] });
  return Packer.toBuffer(docxDocument);
}

// ── Plain text export ────────────────────────────────────────────────────────

/** Serializes a ResumeBuilder document to plain text, suitable for job portal paste boxes. */
export function exportToText(doc) {
  const lines = [];
  lines.push(doc.contact.name || 'Your Name');
  lines.push(contactLine(doc.contact));
  lines.push('');

  if (doc.summary) {
    lines.push('SUMMARY');
    lines.push(doc.summary);
    lines.push('');
  }

  if (doc.experience?.length) {
    lines.push('EXPERIENCE');
    for (const e of doc.experience) {
      lines.push(`${e.title}${e.company ? ' - ' + e.company : ''} (${dateRange(e)})`);
      for (const b of e.bullets || []) lines.push(`  - ${b}`);
    }
    lines.push('');
  }

  if (doc.projects?.length) {
    lines.push('PROJECTS');
    for (const p of doc.projects) {
      lines.push(p.title);
      for (const b of p.bullets || []) lines.push(`  - ${b}`);
    }
    lines.push('');
  }

  if (doc.skills?.length) {
    lines.push('SKILLS');
    lines.push(doc.skills.join(', '));
    lines.push('');
  }

  if (doc.education?.length) {
    lines.push('EDUCATION');
    for (const ed of doc.education) {
      lines.push(`${ed.degree}${ed.institution ? ' - ' + ed.institution : ''} (${dateRange(ed)})`);
    }
  }

  return lines.join('\n');
}

// Register standard font family aliases so Times-Roman/Helvetica bold+italic
// variants resolve correctly (react-pdf ships these as built-ins, no files needed).
Font.registerHyphenationCallback((word) => [word]); // disable automatic hyphenation
