/**
 * components/interview/InterviewAnalytics.jsx — Interview Performance Analytics Tab
 *
 * Shown inside InterviewPrepPage.jsx behind the "Analytics" toggle (next to "Practice").
 * Pulls from GET /api/ai-coach/interview/analytics (score trend, topic breakdown,
 * improvement highlights) and GET /api/ai-coach/interview/sessions (history table).
 * Clicking "Review" on a past session fetches its full Q&A detail on demand via
 * GET /api/ai-coach/interview/sessions/:id and opens a slide-over drawer.
 *
 * Degrades gracefully: a user with zero sessions sees an empty state prompting
 * them to start one, rather than broken/empty charts.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { TrendLine } from '@/components/charts/TrendLine';
import { SkillRadar } from '@/components/charts/SkillRadar';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export function InterviewAnalytics() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [reviewSession, setReviewSession] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [analyticsRes, sessionsRes] = await Promise.all([
          api.get('/ai-coach/interview/analytics'),
          api.get('/ai-coach/interview/sessions?limit=20'),
        ]);
        setAnalytics(analyticsRes.data.data.analytics);
        setSessions(sessionsRes.data.data.sessions || []);
      } catch (err) {
        toast.error(errorMessage(err, 'Failed to load interview analytics'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openReview = async (sessionId) => {
    setLoadingReview(true);
    try {
      const { data } = await api.get(`/ai-coach/interview/sessions/${sessionId}`);
      setReviewSession(data.data.session);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load session detail'));
    } finally {
      setLoadingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner className="h-8 w-8 text-brand" />
        <p className="text-sm text-muted">Loading your interview analytics…</p>
      </div>
    );
  }

  if (!analytics?.hasData) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-faint border border-line mx-auto mb-5">
          <Icon.ChartBar size={24} />
        </span>
        <h3 className="font-serif text-xl font-bold text-ink">No sessions yet</h3>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Complete a mock interview session in the Practice tab to start building your performance analytics — score trends, topic strengths, and personalized focus recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Over Time + Topic Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Score Over Time</h3>
          <TrendLine data={analytics.scoreOverTime} xKey="index" yKey="score" domain={[0, 100]} />
        </div>
        <div className="card p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Topic Breakdown</h3>
          {analytics.topicBreakdown.length >= 3 ? (
            <SkillRadar data={analytics.topicBreakdown.map((t) => ({ category: t.category, count: t.avgScore }))} height={260} />
          ) : (
            <div className="space-y-3 py-4">
              {analytics.topicBreakdown.map((t) => (
                <div key={t.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-ink">{t.category}</span>
                    <span className="text-muted font-mono">{t.avgScore}/100 · {t.count}q</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden border border-line">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${t.avgScore}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-faint pt-2">Practice more topic types to unlock the radar view.</p>
            </div>
          )}
        </div>
      </div>

      {/* Improvement Highlights + Recommended Focus */}
      {(analytics.improvementHighlight || analytics.recommendedFocus) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {analytics.improvementHighlight && (
            <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 flex items-start gap-2.5">
              <Icon.TrendingUp size={16} className="text-brand shrink-0 mt-0.5" />
              <p className="text-xs text-ink leading-relaxed">{analytics.improvementHighlight}</p>
            </div>
          )}
          {analytics.recommendedFocus && (
            <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 flex items-start gap-2.5">
              <Icon.Target size={16} className="text-brand shrink-0 mt-0.5" />
              <p className="text-xs text-ink leading-relaxed">{analytics.recommendedFocus}</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Sessions History */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h3 className="text-xs font-bold uppercase tracking-wider text-faint">Recent Sessions · {analytics.totalSessions} total</h3>
        </div>
        <div className="divide-y divide-line">
          {sessions.map((s) => {
            const date = new Date(s.completedAt || s.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            });
            return (
              <div key={s._id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 border border-line">
                  <span className="text-xs font-bold text-brand">{s.averageScore}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">{s.targetRole}</p>
                  <p className="text-[10px] text-faint mt-0.5">{date} · {s.totalQuestions} question{s.totalQuestions !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => openReview(s._id)}
                  disabled={loadingReview}
                  className="shrink-0 text-xs font-semibold text-brand hover:underline disabled:opacity-50"
                >
                  Review
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {reviewSession && (
        <SessionReviewDrawer session={reviewSession} onClose={() => setReviewSession(null)} />
      )}
    </div>
  );
}

function SessionReviewDrawer({ session, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-surface border-l border-line flex flex-col animate-fade-right">
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <div>
            <h3 className="text-sm font-bold text-ink">{session.targetRole}</h3>
            <p className="text-[10px] text-faint mt-0.5">
              {new Date(session.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}Avg {session.averageScore}/100
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-2 text-faint">
            <Icon.X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {(session.questions || []).map((q, i) => (
            <div key={i} className="rounded-xl border border-line p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-ink leading-relaxed">{q.question}</p>
                <span className="shrink-0 text-xs font-bold text-brand">{q.totalScore}/100</span>
              </div>
              <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{q.answer}</p>
              {q.strengths?.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-brand mb-1">Strengths</p>
                  <ul className="space-y-0.5">
                    {q.strengths.map((s, si) => (
                      <li key={si} className="text-[11px] text-muted">· {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {q.improvements?.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-danger mb-1">To improve</p>
                  <ul className="space-y-0.5">
                    {q.improvements.map((s, si) => (
                      <li key={si} className="text-[11px] text-muted">· {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
