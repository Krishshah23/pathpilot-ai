import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

/** ─── Printable career report page ───
 *  Fetches all data, renders a clean report, and offers a window.print() export.
 */
export default function CareerReportPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [scoreRes, growthRes, resumeRes] = await Promise.all([
          api.get('/path-score'),
          api.get('/growth').catch(() => ({ data: { data: { plan: null } } })),
          api.get('/resume').catch(() => ({ data: { data: { resume: null } } })),
        ]);
        setData({
          pathScore: scoreRes.data.data.pathScore || {},
          growthPlan: growthRes.data?.data?.plan || null,
          resume: resumeRes.data?.data?.resume || null,
        });
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 200);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <Spinner className="h-8 w-8 text-[#2B4C3F]" />
        </div>
      </AppShell>
    );
  }

  const { pathScore, growthPlan, resume } = data || {};
  const score = pathScore?.score ?? pathScore?.displayScore ?? 0;
  const factors = pathScore?.factors || [];
  const skills = user?.profile?.skills || [];
  const dreamRole = user?.profile?.dreamRole || 'Software Engineer';
  const college = user?.profile?.college || '—';
  const branch = user?.profile?.branch || '';
  const semester = user?.profile?.semester || '';
  const resumeSkills = resume?.skills || [];
  const keyGaps = resume?.keyGaps || [];
  const resumeStrengths = resume?.strengths || [];
  const generatedAt = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const scoreColor = score >= 75 ? '#2B4C3F' : score >= 50 ? '#92400E' : '#B85A3C';
  const readinessLabel = score >= 75 ? 'Interview-Ready' : score >= 50 ? 'On Track' : 'Building';

  return (
    <AppShell>
      {/* ── Screen-only action bar ── */}
      <style>{`
        @media print {
          /* Hide app shell headers, floating buttons and screen actions */
          header,
          .no-print,
          button,
          [role="button"] {
            display: none !important;
          }
          
          /* Reset container backgrounds and margins for clean print flow */
          body, 
          html,
          #root,
          .min-h-screen,
          main {
            background: white !important;
            color: #171717 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            box-shadow: none !important;
          }

          /* Format the report container */
          #career-report {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
            border-radius: 0 !important;
          }

          /* Ensure page breaks are handled correctly */
          .page-break {
            break-before: page !important;
            page-break-before: always !important;
          }

          /* Keep background colors, badges, and gradients visible */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="no-print mb-8 pb-6 border-b border-[#EAEAE5]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EAEAE5] bg-[#F5F5F3]">
                <Icon.FileText size={14} className="text-[#525252]" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A3]">Career Report</span>
            </div>
            <h1 className="font-serif text-3xl font-black text-[#171717]">Career Audit PDF</h1>
            <p className="mt-1 text-sm text-[#A3A3A3]">A complete summary of your career readiness, skills, and roadmap progress.</p>
          </div>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="inline-flex items-center gap-2 rounded-xl bg-[#171717] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a2a2a] transition disabled:opacity-60 shrink-0"
          >
            {printing ? <Spinner className="h-4 w-4 text-white" /> : <Icon.Download size={16} />}
            Export as PDF
          </button>
        </div>
      </div>

      {/* ── Printable Report Document ── */}
      <div id="career-report" ref={printRef} className="max-w-4xl mx-auto bg-white rounded-3xl border border-[#EAEAE5] overflow-hidden shadow-sm">

        {/* Report Header */}
        <div className="px-10 py-8" style={{ background: 'linear-gradient(135deg, #171717 0%, #2a2a2a 100%)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-white/40 mb-1">PathPilot AI · Career Intelligence Platform</p>
              <h1 className="text-3xl font-black text-white">{user?.name || 'Student'}</h1>
              <p className="text-sm text-white/60 mt-1">{dreamRole}</p>
              <p className="text-xs text-white/40 mt-1">{college}{branch && ` · ${branch}`}{semester && ` · Sem ${semester}`}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black" style={{ color: scoreColor }}>{score}</div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-white/40">Path Score</div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${scoreColor}25`, color: scoreColor, border: `1px solid ${scoreColor}40` }}>
                {readinessLabel}
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-[10px] text-white/30">Generated {generatedAt}</p>
            <p className="text-[10px] text-white/30">Confidential · pathpilot.ai</p>
          </div>
        </div>

        <div className="p-10 space-y-10">

          {/* Section 1: Readiness Breakdown */}
          {factors.length > 0 && (
            <section>
              <SectionTitle>01 — Readiness Metrics Breakdown</SectionTitle>
              <div className="grid grid-cols-2 gap-4 mt-5">
                {factors.map((f) => {
                  const pct = Math.round((f.score / f.max) * 100) || 0;
                  const color = f.status === 'good' ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
                  return (
                    <div key={f.key} className="rounded-2xl border border-[#EAEAE5] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[#171717]">{f.label}</span>
                        <span className="text-sm font-black font-mono" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#F5F5F3]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <p className="mt-1.5 text-[10px] text-[#A3A3A3]">{f.score} / {f.max} points</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section 2: Skills Inventory */}
          {(skills.length > 0 || resumeSkills.length > 0) && (
            <section>
              <SectionTitle>02 — Technical Skills Inventory</SectionTitle>
              <div className="mt-5 flex flex-wrap gap-2">
                {[...new Set([...skills, ...resumeSkills])].map((skill, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-[#EAEAE5] bg-[#F9F9F8] px-3 py-1.5 text-xs font-medium text-[#525252]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2B4C3F]" />
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Section 3: Resume Insights */}
          {(resumeStrengths.length > 0 || keyGaps.length > 0) && (
            <section>
              <SectionTitle>03 — Resume Intelligence Report</SectionTitle>
              <div className="mt-5 grid grid-cols-2 gap-6">
                {resumeStrengths.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#2B4C3F] mb-3">✦ Strengths Identified</p>
                    <ul className="space-y-2">
                      {resumeStrengths.slice(0, 5).map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#525252]">
                          <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#2B4C3F]/10 border border-[#2B4C3F]/20 flex items-center justify-center text-[#2B4C3F] text-[9px] font-bold">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {keyGaps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#92400E] mb-3">⚠ Skill Gaps to Address</p>
                    <ul className="space-y-2">
                      {keyGaps.slice(0, 5).map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#525252]">
                          <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#92400E]/10 border border-[#92400E]/20 flex items-center justify-center text-[#92400E] text-[9px] font-bold">{i + 1}</span>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 4: Growth Plan Snapshot */}
          {growthPlan && (
            <section className="page-break">
              <SectionTitle>04 — Learning Roadmap Snapshot</SectionTitle>
              <div className="mt-5 grid grid-cols-3 gap-4">
                {[
                  { label: 'Target Role', value: growthPlan.targetRole || dreamRole },
                  { label: 'Total Tasks', value: growthPlan.totalTasks || '—' },
                  { label: 'Completed', value: growthPlan.completedTasks || 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-[#EAEAE5] bg-[#F9F9F8] p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A3]">{label}</p>
                    <p className="mt-2 text-xl font-black text-[#171717]">{value}</p>
                  </div>
                ))}
              </div>
              {growthPlan.weeks?.length > 0 && (
                <div className="mt-5 space-y-3">
                  {growthPlan.weeks.slice(0, 4).map((week, i) => (
                    <div key={i} className="rounded-xl border border-[#EAEAE5] px-4 py-3 flex items-center gap-4">
                      <span className="text-xs font-black text-[#A3A3A3] shrink-0 w-14">Wk {week.week || i + 1}</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#171717]">{week.theme || week.title || `Week ${i + 1}`}</p>
                        {week.topics?.length > 0 && (
                          <p className="text-[10px] text-[#A3A3A3] mt-0.5">{week.topics.slice(0, 3).join(' · ')}</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${week.completedTasks >= (week.totalTasks || 1) ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F5F5F3] text-[#A3A3A3]'}`}>
                        {week.completedTasks || 0}/{week.totalTasks || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Report Footer */}
          <footer className="pt-8 border-t border-[#EAEAE5] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#A3A3A3]">PathPilot AI Career Intelligence Platform</p>
              <p className="text-[10px] text-[#D4D4D4] mt-0.5">This report is auto-generated and reflects verified profile data.</p>
            </div>
            <p className="text-[10px] text-[#D4D4D4]">{generatedAt}</p>
          </footer>
        </div>
      </div>
    </AppShell>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-black text-[#171717] tracking-tight">{children}</h2>
      <div className="flex-1 h-px bg-[#EAEAE5]" />
    </div>
  );
}
