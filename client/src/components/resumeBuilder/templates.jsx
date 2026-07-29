/**
 * components/resumeBuilder/templates.jsx — Live Preview Templates
 *
 * Three visually distinct presentational renderers for the editor's live-preview
 * panel, matching the identity of their server-side PDF counterparts
 * (resumeBuilderExport.service.js) — same section order, same accent choices —
 * though the two aren't the literal same component (the PDF engine uses
 * @react-pdf/renderer's own primitives, not DOM/Tailwind).
 */

// Parser fallback placeholders (e.g. "present (label detected, no URL extracted)") must
// never reach a live preview or exported document — they're internal signals, not content.
function isRealValue(value) {
  return Boolean(value) && !/label detected/i.test(value);
}

function contactLine(contact) {
  return [
    contact.name && null,
    contact.email,
    contact.phone,
    contact.location,
    contact.linkedin,
    contact.github,
    contact.website,
  ]
    .filter(isRealValue)
    .join('  ·  ');
}

function dateRange(entry) {
  const end = entry.current ? 'Present' : entry.endDate;
  return [entry.startDate, end].filter(Boolean).join(' – ');
}

export function MinimalPreview({ doc }) {
  return (
    <div className="bg-white text-[#171717] p-8 text-[13px] leading-snug font-sans">
      <h1 className="text-2xl font-bold">{doc.contact.name || 'Your Name'}</h1>
      <p className="text-[11px] text-[#525252] mt-1">{contactLine(doc.contact)}</p>

      {doc.summary && (
        <Section title="Summary" accent="#2B4C3F">
          <p className="text-[12px] leading-relaxed">{doc.summary}</p>
        </Section>
      )}

      {doc.experience?.length > 0 && (
        <Section title="Experience" accent="#2B4C3F">
          {doc.experience.map((e, i) => (
            <EntryBlock key={i} title={`${e.title}${e.company ? ' · ' + e.company : ''}`} meta={dateRange(e)} bullets={e.bullets} />
          ))}
        </Section>
      )}

      {doc.projects?.length > 0 && (
        <Section title="Projects" accent="#2B4C3F">
          {doc.projects.map((p, i) => (
            <EntryBlock key={i} title={p.title} bullets={p.bullets} />
          ))}
        </Section>
      )}

      {doc.skills?.length > 0 && (
        <Section title="Skills" accent="#2B4C3F">
          <p className="text-[12px]">{doc.skills.join('  ·  ')}</p>
        </Section>
      )}

      {doc.education?.length > 0 && (
        <Section title="Education" accent="#2B4C3F">
          {doc.education.map((ed, i) => (
            <EntryBlock key={i} title={`${ed.degree}${ed.institution ? ' · ' + ed.institution : ''}`} meta={dateRange(ed)} />
          ))}
        </Section>
      )}
    </div>
  );
}

export function ModernPreview({ doc }) {
  return (
    <div className="bg-white text-[#171717] text-[13px] leading-snug font-sans">
      <div style={{ background: '#0C1810' }} className="px-8 py-7">
        <h1 className="text-2xl font-bold text-white">{doc.contact.name || 'Your Name'}</h1>
        <p className="text-[11px] mt-1" style={{ color: '#C8DDD6' }}>{contactLine(doc.contact)}</p>
      </div>
      <div className="px-8 py-6">
        {doc.summary && (
          <Section title="Summary" accent="#0C1810" underline>
            <p className="text-[12px] leading-relaxed">{doc.summary}</p>
          </Section>
        )}
        {doc.experience?.length > 0 && (
          <Section title="Experience" accent="#0C1810" underline>
            {doc.experience.map((e, i) => (
              <EntryBlock key={i} title={`${e.title}${e.company ? ' · ' + e.company : ''}`} meta={dateRange(e)} bullets={e.bullets} />
            ))}
          </Section>
        )}
        {doc.projects?.length > 0 && (
          <Section title="Projects" accent="#0C1810" underline>
            {doc.projects.map((p, i) => (
              <EntryBlock key={i} title={p.title} bullets={p.bullets} />
            ))}
          </Section>
        )}
        {doc.skills?.length > 0 && (
          <Section title="Skills" accent="#0C1810" underline>
            <div className="flex flex-wrap gap-1.5">
              {doc.skills.map((s, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded" style={{ background: '#F0F5F3', color: '#2B4C3F' }}>{s}</span>
              ))}
            </div>
          </Section>
        )}
        {doc.education?.length > 0 && (
          <Section title="Education" accent="#0C1810" underline>
            {doc.education.map((ed, i) => (
              <EntryBlock key={i} title={`${ed.degree}${ed.institution ? ' · ' + ed.institution : ''}`} meta={dateRange(ed)} />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

export function ClassicPreview({ doc }) {
  return (
    <div className="bg-white text-[#1a1a1a] p-9 text-[13px] leading-snug" style={{ fontFamily: 'Georgia, serif' }}>
      <h1 className="text-xl font-bold text-center tracking-wide">{(doc.contact.name || 'Your Name').toUpperCase()}</h1>
      <p className="text-[11px] text-center text-[#3a3a3a] mt-1">{contactLine(doc.contact)}</p>

      {doc.summary && (
        <Section title="Summary" center hr>
          <p className="text-[12px] leading-relaxed text-center">{doc.summary}</p>
        </Section>
      )}
      {doc.experience?.length > 0 && (
        <Section title="Experience" center hr>
          {doc.experience.map((e, i) => (
            <EntryBlock key={i} title={`${e.title}${e.company ? ', ' + e.company : ''}`} meta={dateRange(e)} bullets={e.bullets} italicMeta bulletChar="–" />
          ))}
        </Section>
      )}
      {doc.projects?.length > 0 && (
        <Section title="Projects" center hr>
          {doc.projects.map((p, i) => (
            <EntryBlock key={i} title={p.title} bullets={p.bullets} bulletChar="–" />
          ))}
        </Section>
      )}
      {doc.skills?.length > 0 && (
        <Section title="Skills" center hr>
          <p className="text-[12px] text-center">{doc.skills.join('  ·  ')}</p>
        </Section>
      )}
      {doc.education?.length > 0 && (
        <Section title="Education" center hr>
          {doc.education.map((ed, i) => (
            <EntryBlock key={i} title={`${ed.degree}${ed.institution ? ', ' + ed.institution : ''}`} meta={dateRange(ed)} italicMeta />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, accent = '#2B4C3F', underline, center, hr, children }) {
  return (
    <div className="mt-4">
      <h2
        className={`text-[11px] font-bold uppercase tracking-wider ${center ? 'text-center' : ''}`}
        style={{ color: accent, letterSpacing: center ? 2 : 1 }}
      >
        {title}
      </h2>
      {underline && <div className="w-6 h-0.5 mt-1 mb-2" style={{ background: accent }} />}
      {hr && <div className="border-b border-[#1a1a1a] mt-1 mb-2" />}
      {!underline && !hr && <div className="mb-1.5" />}
      {children}
    </div>
  );
}

function EntryBlock({ title, meta, bullets, italicMeta, bulletChar = '•' }) {
  return (
    <div className="mb-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12.5px] font-bold">{title}</p>
        {meta && <p className={`text-[11px] text-[#525252] shrink-0 ${italicMeta ? 'italic' : ''}`}>{meta}</p>}
      </div>
      {bullets?.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {bullets.map((b, i) => (
            <li key={i} className="text-[11.5px] leading-relaxed pl-3">{bulletChar} {b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const TEMPLATES = { minimal: MinimalPreview, modern: ModernPreview, classic: ClassicPreview };
