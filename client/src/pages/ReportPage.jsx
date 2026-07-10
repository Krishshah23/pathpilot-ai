import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const STAGE_LABELS = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  oa: 'Online Assessment',
  interview: 'Interview',
  hr: 'HR',
  offer: 'Offer',
  rejected: 'Rejected',
};

const STAGE_COLORS = {
  wishlist: '#626b80',
  applied: '#38bdf8',
  oa: '#f59e0b',
  interview: '#8b5cf6',
  hr: '#818cf8',
  offer: '#22c55e',
  rejected: '#ef4444',
};

/**
 * Career Report — generates a professional printable summary combining data
 * from every module. Uses CSS @media print to create a clean PDF layout.
 */
export default function ReportPage() {
  const { user } = useAuth();
  const toast = useToast();
  const printRef = useRef(null);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/report');
        setReport(data.data.report);
      } catch (err) {
        toast.error(errorMessage(err, 'Failed to generate report'));
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <AppShell title="Career Report">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
        </div>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell title="Career Report">
        <EmptyState
          icon={<Icon.Document />}
          title="No report data"
          description="Complete your profile, upload a resume, and build a growth plan to generate a career report."
        />
      </AppShell>
    );
  }

  const r = report;

  return (
    <AppShell
      title="Career Report"
      subtitle={`Generated ${new Date(r.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Icon.Printer size={16} /> Print / PDF
          </Button>
        </div>
      }
    >
      {/* ─── Printable area ─── */}
      <div ref={printRef} className="report-printable space-y-6">
        {/* ─── Header Banner ─── */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand/10 via-violet/8 to-transparent" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">{r.student.name}</h2>
              <p className="mt-1 text-sm text-muted">{r.student.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
                {r.student.college && (
                  <span className="flex items-center gap-1">
                    <Icon.Building size={12} /> {r.student.college}
                  </span>
                )}
                {r.student.branch && <span>{r.student.branch}</span>}
                {r.student.semester && <span>Semester {r.student.semester}</span>}
                {r.student.dreamRole && (
                  <span className="flex items-center gap-1">
                    <Icon.Target size={12} /> {r.student.dreamRole}
                  </span>
                )}
              </div>
            </div>
            <div className="text-center sm:text-right">
              <div className="font-display text-4xl font-black text-gradient">
                {r.pathScore.displayScore ?? Math.round(r.pathScore.score || 0)}
              </div>
              <p className="text-xs font-semibold text-muted">Path Score</p>
              <p className="mt-0.5 text-xs text-faint">{r.pathScore.label}</p>
            </div>
          </div>
        </Card>

        {/* ─── Path Score Breakdown ─── */}
        <ReportSection title="Path Score Breakdown" icon={Icon.Gauge}>
          <div className="grid gap-3 sm:grid-cols-2">
            {r.pathScore.factors.map((f) => (
              <div
                key={f.key}
                className="rounded-xl border border-line bg-surface-2/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{f.label}</span>
                  <span className={cn(
                    'rounded-md px-1.5 py-0.5 text-[11px] font-bold',
                    f.status === 'good' ? 'bg-success/15 text-success' :
                    f.status === 'warn' ? 'bg-warning/15 text-warning' :
                    'bg-danger/15 text-danger'
                  )}>
                    {f.score}/{f.max}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-2 rounded-full bg-surface-2">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      f.status === 'good' ? 'bg-success' :
                      f.status === 'warn' ? 'bg-warning' :
                      'bg-danger'
                    )}
                    style={{ width: `${f.percent}%` }}
                  />
                </div>
                {f.detail && <p className="mt-2 text-xs text-faint">{f.detail}</p>}
              </div>
            ))}
          </div>

          {/* Readiness */}
          {r.pathScore.readiness && (
            <div className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-4">
              <p className="text-sm font-semibold text-brand-soft">
                Career Readiness: {r.pathScore.readiness.label}
              </p>
              <p className="mt-1 text-xs text-muted">{r.pathScore.readiness.summary}</p>
            </div>
          )}
        </ReportSection>

        {/* ─── Resume Summary ─── */}
        {r.resume && (
          <ReportSection title="Resume Intelligence" icon={Icon.FileText}>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Health Score" value={`${r.resume.healthScore}/100`} />
              <StatCard label="Skills Extracted" value={r.resume.skills.length} />
              <StatCard label="Resume Versions" value={r.resume.versions} />
            </div>

            {/* Health breakdown */}
            {r.resume.healthBreakdown?.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Health Factors</p>
                {r.resume.healthBreakdown.map((h) => (
                  <div key={h.label} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2/30 px-3 py-2">
                    <span className={cn(
                      'h-2 w-2 rounded-full',
                      h.status === 'good' ? 'bg-success' : h.status === 'warn' ? 'bg-warning' : 'bg-danger'
                    )} />
                    <span className="flex-1 text-sm text-ink">{h.label}</span>
                    <span className="text-xs text-faint">{h.score}/{h.max}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            {r.resume.projects?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Projects</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {r.resume.projects.map((p, i) => (
                    <div key={i} className="rounded-lg border border-line bg-surface-2/30 p-3">
                      <p className="text-sm font-medium text-ink">{p.title}</p>
                      {p.description && <p className="mt-1 text-xs text-faint line-clamp-2">{p.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {r.resume.suggestions?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Improvement Suggestions</p>
                <ul className="space-y-1.5">
                  {r.resume.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted">
                      <Icon.ArrowRight size={12} className="mt-0.5 shrink-0 text-brand-soft" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ReportSection>
        )}

        {/* ─── Skills ─── */}
        {r.student.skills?.length > 0 && (
          <ReportSection title="Skill Profile" icon={Icon.Sparkles}>
            <div className="flex flex-wrap gap-2">
              {r.student.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs text-muted"
                >
                  {skill}
                </span>
              ))}
            </div>
            {/* Distribution */}
            {r.skillDistribution?.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {r.skillDistribution.filter((d) => d.count > 0).map((d) => (
                  <div key={d.category} className="flex items-center gap-3">
                    <span className="w-28 text-xs text-faint truncate">{d.category}</span>
                    <div className="flex-1 h-2 rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-violet"
                        style={{ width: `${Math.min((d.count / Math.max(...r.skillDistribution.map((x) => x.count), 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-semibold text-ink">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </ReportSection>
        )}

        {/* ─── Growth Plan ─── */}
        {r.growthPlan && (
          <ReportSection title="Growth Path" icon={Icon.Route}>
            <div className="grid gap-4 sm:grid-cols-4">
              <StatCard label="Target Role" value={r.growthPlan.targetRole} small />
              <StatCard label="Progress" value={`${r.growthPlan.percent}%`} />
              <StatCard label="Tasks Done" value={`${r.growthPlan.completedTasks}/${r.growthPlan.totalTasks}`} />
              <StatCard label="Total Hours" value={`${r.growthPlan.totalHours}h`} />
            </div>
            {r.growthPlan.summary && (
              <p className="mt-3 text-sm text-muted">{r.growthPlan.summary}</p>
            )}
            {r.growthPlan.strengths?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Strengths</p>
                <div className="flex flex-wrap gap-2">
                  {r.growthPlan.strengths.map((s) => (
                    <span key={s} className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-1 text-xs text-success">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </ReportSection>
        )}

        {/* ─── Opportunities ─── */}
        {r.opportunities.total > 0 && (
          <ReportSection title="Opportunity Tracker" icon={Icon.Briefcase}>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Total Applications" value={r.opportunities.total} />
              <StatCard
                label="Offers"
                value={r.opportunities.byStage.offer || 0}
              />
              <StatCard
                label="Active"
                value={r.opportunities.total - (r.opportunities.byStage.offer || 0) - (r.opportunities.byStage.rejected || 0)}
              />
            </div>

            {/* Stage breakdown */}
            <div className="mt-4 flex flex-wrap gap-3">
              {Object.entries(r.opportunities.byStage).map(([stage, count]) => (
                <div
                  key={stage}
                  className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/30 px-3 py-1.5"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: STAGE_COLORS[stage] || '#626b80' }}
                  />
                  <span className="text-xs text-muted">{STAGE_LABELS[stage] || stage}</span>
                  <span className="text-xs font-bold text-ink">{count}</span>
                </div>
              ))}
            </div>

            {/* Recent */}
            {r.opportunities.recent?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Recent Applications</p>
                <div className="space-y-2">
                  {r.opportunities.recent.map((o, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2/30 px-3 py-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: STAGE_COLORS[o.stage] || '#626b80' }}
                      />
                      <span className="flex-1 text-sm text-ink">{o.company}</span>
                      <span className="text-xs text-faint">{o.role}</span>
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: `${STAGE_COLORS[o.stage] || '#626b80'}18`,
                          color: STAGE_COLORS[o.stage] || '#626b80',
                        }}
                      >
                        {STAGE_LABELS[o.stage] || o.stage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ReportSection>
        )}

        {/* ─── Footer ─── */}
        <div className="rounded-2xl border border-line bg-surface/60 px-6 py-4 text-center print-footer">
          <p className="text-xs text-faint">
            Generated by <span className="font-semibold text-brand-soft">PathPilot AI</span> on{' '}
            {new Date(r.generatedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p className="mt-1 text-[11px] text-faint/60">
            Navigate Your Career. Powered by Intelligence.
          </p>
        </div>
      </div>

      {/* ─── Print-specific styles ─── */}
      <style>{printStyles}</style>
    </AppShell>
  );
}

/* ─── Sub-components ─── */

function ReportSection({ title, icon: Ico, children }) {
  return (
    <Card className="report-section">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand-soft">
          <Ico size={16} />
        </span>
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function StatCard({ label, value, small = false }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-4 text-center">
      <p className="text-xs text-faint">{label}</p>
      <p className={cn(
        'mt-1 font-display font-bold text-ink',
        small ? 'text-sm truncate' : 'text-xl'
      )}>
        {value}
      </p>
    </div>
  );
}

/* ─── Print CSS ─── */
const printStyles = `
@media print {
  /* Hide app chrome */
  body { background: #fff !important; color: #111 !important; }
  body::before { display: none !important; }

  /* Hide sidebar, header, scrollbars */
  aside, header, nav,
  .no-print,
  button { display: none !important; }

  /* Show only the printable area */
  .report-printable {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    padding: 0 24px;
  }

  /* Override dark theme for print */
  .report-printable * {
    color: #111 !important;
    border-color: #ddd !important;
    background: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .report-section {
    break-inside: avoid;
    border: 1px solid #ddd !important;
    border-radius: 12px !important;
    padding: 20px !important;
    margin-bottom: 16px !important;
  }

  /* Keep gradient text visible in print */
  .text-gradient {
    -webkit-text-fill-color: #6366f1 !important;
    color: #6366f1 !important;
  }

  /* Print footer */
  .print-footer * {
    color: #888 !important;
  }

  /* Progress bars in print */
  [style*="width"] {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`;
