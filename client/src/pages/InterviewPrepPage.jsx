/**
 * pages/InterviewPrepPage.jsx — AI Mock Interview Simulator Hub Page (/interview-prep)
 *
 * ARCHITECTURAL ROLE:
 * Real-time AI mock interview practice environment:
 * 1. Gap-Targeted Questions: Generates interview questions dynamically targeting candidate key gaps via Gemini.
 * 2. Speech-to-Text Voice Transcription: Uses browser `webkitSpeechRecognition` for hands-free answer dictation.
 * 3. Countdown Response Timer: Tracks response duration in seconds.
 * 4. Multi-Dimensional Rubric Evaluation: Evaluates answers on Relevance (30%), Depth (40%), and Communication (30%).
 * 5. Session History & Scoring Trends: Persists completed sessions in MongoDB for score progression analysis.
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { InterviewAnalytics } from '@/components/interview/InterviewAnalytics';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { DREAM_ROLES } from '@/config/careerData';
import { cn } from '@/lib/cn';

export default function InterviewPrepPage() {
  const { user, refreshUser } = useAuth();
  const [view, setView] = useState('practice'); // practice | analytics
  const [stage, setStage] = useState('setup'); // setup | loading | active | evaluating | result | complete
  const [resume, setResume] = useState(null);
  const [loadingResume, setLoadingResume] = useState(true);

  // Current question state
  const [questionData, setQuestionData] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [evaluation, setEvaluation] = useState(null);

  // Session state
  const [questionsAsked, setQuestionsAsked] = useState([]);
  const [sessionScores, setSessionScores] = useState([]);
  const [sessionLog, setSessionLog] = useState([]); // full Q&A history for persistence
  const [gapIndex, setGapIndex] = useState(0);
  const [savingSession, setSavingSession] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef(null);

  const targetRole = user?.profile?.dreamRole || 'Software Engineer';
  const [selectedRole, setSelectedRole] = useState(targetRole);
  const keyGaps = resume?.keyGaps || [];

  // Always include the user's current role even if it's a custom value not in DREAM_ROLES
  const roleOptions = [...new Set([targetRole, ...(DREAM_ROLES || [])])];

  useEffect(() => {
    if (user?.profile?.dreamRole) {
      setSelectedRole(user.profile.dreamRole);
    }
  }, [user?.profile?.dreamRole]);


  /* ── Load latest resume (for gaps) ── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/resume');
        setResume(data.data.resume);
      } catch { /* no resume */ }
      finally { setLoadingResume(false); }
    })();
  }, []);

  /* ── Load past interview sessions ── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/ai-coach/interview/sessions');
        setPastSessions(data.data.sessions || []);
      } catch { /* silent */ }
      finally { setLoadingSessions(false); }
    })();
  }, []);

  /* ── Timer ── */
  const startTimer = () => {
    setSecondsElapsed(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
  };
  const stopTimer = () => clearInterval(timerRef.current);
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  /* ── Speech API ── */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = 'en-US';
    r.onstart = () => { setIsListening(true); setSpeechError(''); };
    r.onerror = (e) => {
      setSpeechError(e.error === 'not-allowed' ? 'Microphone blocked. Enable in browser settings.' : `Error: ${e.error}`);
      setIsListening(false);
    };
    r.onend = () => setIsListening(false);
    r.onresult = (e) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      }
      if (final) setResponseText((prev) => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + final);
    };
    recognitionRef.current = r;
    return () => { r.abort(); clearInterval(timerRef.current); };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) { setSpeechError('Web Speech API not supported. Use Chrome or Edge.'); return; }
    if (isListening) recognitionRef.current.stop();
    else { setSpeechError(''); try { recognitionRef.current.start(); } catch { recognitionRef.current.stop(); } }
  };

  /* ── Fetch question from Gemini ── */
  const fetchQuestion = async (idx = 0) => {
    setError(''); setStage('loading'); setResponseText(''); setEvaluation(null);
    try {
      const { data } = await api.post('/ai-coach/interview/question', {
        gapIndex: idx,
        previousQuestions: questionsAsked,
        difficulty: 'mid',
        targetRole: selectedRole,   // pass the chosen role to the backend
      });
      setQuestionData(data.data);
      setQuestionsAsked((prev) => [...prev, data.data.question]);
      setStage('active');
      startTimer();
    } catch (err) {
      setError(errorMessage(err, 'Could not generate question.'));
      setStage('setup');
    }
  };

  /* ── Commit role change to profile + trigger Gemini re-analysis ── */
  const commitRoleIfChanged = async (role) => {
    if (role === user?.profile?.dreamRole) return; // nothing to do
    try {
      // 1. Persist the new role to the user profile (top-level body, not nested)
      await api.patch('/profile', { dreamRole: role });
      await refreshUser();
      // 2. Re-run Gemini analysis against the new role so gaps/fit score are fresh
      const { data } = await api.post('/resume/reanalyze', { targetRole: role });
      // 3. Update local resume state with newly analysed data
      if (data?.data?.resume) setResume(data.data.resume);
    } catch { /* silent — don't block session start */ }
  };

  const startSession = async () => {
    setQuestionsAsked([]); setSessionScores([]); setSessionLog([]); setGapIndex(0);
    await commitRoleIfChanged(selectedRole);
    fetchQuestion(0);
  };

  /* ── Submit answer for Gemini evaluation ── */
  const submitAnswer = async () => {
    if (!responseText.trim()) return;
    if (isListening) recognitionRef.current?.stop();
    stopTimer();
    setError(''); setStage('evaluating');
    try {
      const { data } = await api.post('/ai-coach/interview/evaluate', {
        question: questionData.question,
        answer: responseText,
        rubric: questionData.rubric,
        questionType: questionData.questionType,
      });
      const evalData = data.data;
      setEvaluation(evalData);
      setSessionScores((prev) => [...prev, evalData.totalScore]);
      // Track the full Q&A result for session persistence
      setSessionLog((prev) => [...prev, {
        question: questionData.question,
        answer: responseText,
        gapAddressed: questionData.gapAddressed || '',
        questionType: questionData.questionType || 'general',
        totalScore: evalData.totalScore,
        grade: evalData.grade || '',
        strengths: evalData.strengths || [],
        improvements: evalData.improvements || [],
        modelAnswer: evalData.modelAnswer || '',
        timeTakenSeconds: secondsElapsed,
      }]);
      setStage('result');
    } catch (err) {
      setError(errorMessage(err, 'Evaluation failed.'));
      setStage('active'); startTimer();
    }
  };

  /* ── Next question ── */
  const nextQuestion = () => {
    const nextIdx = (gapIndex + 1) % Math.max(keyGaps.length, 1);
    setGapIndex(nextIdx);
    fetchQuestion(nextIdx);
  };

  const endSession = async () => {
    stopTimer();
    const currentLog = [...sessionLog];
    const currentScores = [...sessionScores];

    // Save to DB if at least one question was answered
    if (currentLog.length > 0) {
      setSavingSession(true);
      try {
        await api.post('/ai-coach/interview/save-session', {
          questions: currentLog,
          gapsAddressed: [...new Set(currentLog.map(q => q.gapAddressed).filter(Boolean))],
        });
      } catch { /* silent — don't block UX if save fails */ }
      finally { setSavingSession(false); }
      setStage('complete');
    } else {
      // No questions answered, just reset
      resetSession();
    }
  };

  const resetSession = () => {
    setStage('setup'); setQuestionData(null); setEvaluation(null);
    setResponseText(''); setQuestionsAsked([]); setSessionScores([]);
    setSessionLog([]); setGapIndex(0);
  };

  const avgScore = sessionScores.length > 0
    ? Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length)
    : null;

  return (
    <AppShell>
      <div className="space-y-8">

        {/* ── Branded Premium Banner ── */}
        <div className="banner-premium rounded-2xl p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white opacity-10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1.5">Interview Prep</p>
            <h1 className="font-serif text-3xl font-black text-white">AI Mock Interview Coach</h1>
            <p className="mt-2 text-sm text-white/70 max-w-xl">
              Practice role-specific scenarios generated from your resume gaps. Get real-time AI evaluation and use voice dictation to answer.
            </p>
          </div>
          {stage === 'active' && (() => {
            const timerColor = secondsElapsed < 30 ? 'var(--color-warning)' : secondsElapsed <= 120 ? 'var(--color-brand)' : 'var(--color-danger)';
            return (
              <div className="relative z-10 shrink-0">
                <span className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-sm font-mono font-bold text-white shadow-sm">
                  <span className="h-2.5 w-2.5 rounded-full animate-ping" style={{ backgroundColor: timerColor }} />
                  <span className="h-2.5 w-2.5 rounded-full absolute" style={{ backgroundColor: timerColor }} />
                  <span className="ml-3">{fmt(secondsElapsed)}</span>
                </span>
              </div>
            );
          })()}
        </div>

        {/* ── Practice / Analytics Toggle ── */}
        <div className="apple-segmented">
          {[
            { key: 'practice', label: 'Practice', icon: <Icon.Sparkles size={13} /> },
            { key: 'analytics', label: 'Analytics', icon: <Icon.ChartBar size={13} /> },
          ].map((tab) => {
            const isActive = view === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={cn(
                  'btn-press apple-segmented-item flex items-center gap-1.5 px-4 py-2 text-xs',
                  isActive ? 'text-ink' : 'text-muted hover:text-ink'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="interview-tab-indicator"
                    className="absolute inset-0 rounded-full bg-surface shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">{tab.icon} {tab.label}</span>
              </button>
            );
          })}
        </div>

        {view === 'analytics' && <InterviewAnalytics />}

        {view === 'practice' && (
        <>
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            <Icon.AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* ── SETUP ── */}
        {stage === 'setup' && (
          <div className="max-w-2xl mx-auto">
            <div className="card p-10 text-center">
              <h2 className="font-serif text-2xl font-bold text-ink">Ready to practice?</h2>
              <p className="mt-3 text-sm text-muted max-w-md mx-auto leading-relaxed">
                AI will generate questions targeting your actual resume gaps for{' '}
                <span className="font-semibold text-ink">{selectedRole}</span>.
              </p>

              {/* Role selector */}
              <div className="mt-5 max-w-xs mx-auto">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-faint mb-1.5">Target Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full input text-sm h-10"
                >
                  {roleOptions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Gap preview */}
              {loadingResume ? (
                <div className="mt-6 flex justify-center"><Spinner className="h-5 w-5 text-muted" /></div>
              ) : keyGaps.length > 0 ? (
                <div className="mt-6 text-left rounded-xl border border-line border-l-4 border-l-danger bg-surface-2 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-danger mb-2">
                    {keyGaps.length} gap{keyGaps.length > 1 ? 's' : ''} identified — questions will target these
                  </p>
                  {keyGaps.slice(0, 3).map((gap, i) => (
                    <p key={i} className="text-xs text-muted mt-1 flex items-start gap-1.5">
                      <span className="font-bold text-danger shrink-0">{i + 1}.</span> {gap}
                    </p>
                  ))}
                  {keyGaps.length > 3 && <p className="text-xs text-faint mt-1">+{keyGaps.length - 3} more</p>}
                </div>
              ) : (
                <div className="mt-6 text-left rounded-xl border border-line bg-surface-2 p-4">
                  <p className="text-xs text-muted">
                    {resume
                      ? 'No specific gaps detected — general role questions will be generated.'
                      : 'No resume analyzed yet — questions will be based on your target role only. Upload a resume for gap-specific practice.'}
                  </p>
                </div>
              )}

              <div className="mt-6 grid sm:grid-cols-3 gap-3 text-left max-w-md mx-auto">
                {[
                  { label: 'Target Role', value: selectedRole },
                  { label: 'Evaluation', value: 'AI-Powered' },
                  { label: 'Questions', value: keyGaps.length > 0 ? 'Gap-targeted' : 'Role-based' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-line p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-faint">{label}</p>
                    <p className="mt-1 text-xs font-semibold text-ink">{value}</p>
                  </div>
                ))}
              </div>

              {avgScore !== null && (
                <p className="mt-4 text-xs text-muted">
                  Session avg so far: <span className="font-bold text-ink">{avgScore}/100</span> ({sessionScores.length} question{sessionScores.length > 1 ? 's' : ''})
                </p>
              )}

              <button
                onClick={startSession}
                className="btn-press mt-8 h-12 px-10 rounded-xl bg-brand text-white font-semibold hover:bg-brand-soft transition-colors flex items-center gap-2 mx-auto"
              >
                <Icon.Sparkles size={16} /> Start Session
              </button>
            </div>
          </div>
        )}

        {/* ── PAST SESSIONS ── */}
        {stage === 'setup' && !loadingSessions && pastSessions.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon.History size={16} className="text-muted" />
                <h3 className="font-semibold text-sm text-ink">Past Sessions</h3>
                <span className="ml-auto text-[10px] text-faint">{pastSessions.length} session{pastSessions.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {pastSessions.slice(0, 5).map((s) => {
                  const date = new Date(s.completedAt || s.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  });
                  const scoreColor = s.averageScore >= 75 ? 'var(--color-brand)' : s.averageScore >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
                  return (
                    <div key={s._id} className="flex items-center gap-4 rounded-xl border border-line bg-canvas px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                        style={{ backgroundColor: `color-mix(in srgb, ${scoreColor} 18%, transparent)` }}>
                        <span className="text-sm font-bold" style={{ color: scoreColor }}>{s.averageScore}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{s.targetRole}</p>
                        <p className="text-[10px] text-faint mt-0.5">
                          {s.totalQuestions} question{s.totalQuestions !== 1 ? 's' : ''}
                          {s.gapsAddressed?.length > 0 && ` · ${s.gapsAddressed.length} gap${s.gapsAddressed.length !== 1 ? 's' : ''} covered`}
                        </p>
                      </div>
                      <span className="text-[10px] text-faint shrink-0">{date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">AI is preparing your question…</p>
          </div>
        )}

        {/* ── ACTIVE ── */}
        {stage === 'active' && questionData && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            {/* Question card */}
            <div className="card p-8 space-y-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted bg-surface-2 border border-line px-2.5 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted animate-pulse" /> Live Question
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-faint bg-surface-2 border border-line px-2 py-1 rounded-full">
                  {questionData.questionType}
                </span>
              </div>

              <p className="text-sm font-semibold text-ink leading-relaxed">{questionData.question}</p>

              {questionData.gapAddressed && (
                <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-danger mb-1">Testing gap</p>
                  <p className="text-xs text-muted">{questionData.gapAddressed}</p>
                </div>
              )}

              {questionData.hint && (
                <details className="group">
                  <summary className="text-xs text-faint cursor-pointer hover:text-muted transition-colors">
                    💡 Show hint
                  </summary>
                  <p className="mt-2 text-xs text-muted pl-4 border-l-2 border-line">{questionData.hint}</p>
                </details>
              )}
            </div>

            {/* Response console */}
            <div className="card p-8 flex flex-col">
              <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
                <h3 className="text-sm font-bold text-ink">Your Response</h3>
                <div className="flex items-center gap-2">
                  {isListening && (
                    <span className="text-xs font-semibold text-danger flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-danger animate-pulse" /> Listening…
                    </span>
                  )}
                  <button
                    onClick={toggleListening}
                    title={isListening ? 'Stop' : 'Voice input'}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                      isListening
                        ? 'border-danger/20 bg-danger/5 text-danger'
                        : 'border-line bg-surface text-muted hover:bg-surface-2'
                    )}
                  >
                    <Icon.Mic size={14} />
                  </button>
                </div>
              </div>

              {speechError && <p className="text-xs text-danger mb-4 pl-3 border-l-2 border-danger">{speechError}</p>}

              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Type your answer here, or click the mic to dictate…"
                className="flex-1 min-h-[200px] resize-none rounded-xl border border-line bg-canvas p-4 text-sm text-ink placeholder-line focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"
              />

              <div className="flex items-center justify-between mt-5 pt-5 border-t border-line">
                <button onClick={endSession} className="text-sm text-faint hover:text-danger transition-colors">
                  End session
                </button>
                <button
                  onClick={submitAnswer}
                  disabled={!responseText.trim()}
                  className="btn-press h-10 px-6 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-soft disabled:opacity-40 transition-colors"
                >
                  Submit Answer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EVALUATING ── */}
        {stage === 'evaluating' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">AI is evaluating your answer…</p>
          </div>
        )}

        {/* ── RESULT ── */}
        {stage === 'result' && evaluation && (() => {
          const wordCount = responseText.trim().split(/\s+/).filter(Boolean).length;
          const timeTaken = secondsElapsed || 30; // fallback if 0
          const wpm = Math.round((wordCount / timeTaken) * 60);
          const fillers = (responseText.match(/\b(um|uh|like|basically|actually|so)\b/gi) || []).length;
          const paceStatus = wpm >= 110 && wpm <= 160 ? 'Optimal' : wpm < 110 ? 'Too Slow' : 'Too Fast';
          const paceColor = paceStatus === 'Optimal' ? 'var(--color-brand)' : 'var(--color-warning)';

          return (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="grid gap-6 md:grid-cols-[250px_1fr]">
                {/* Score gauge and speech metrics */}
                <div className="space-y-6">
                  <div className="card p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-faint mb-4">Overall Score</p>
                    <div className="relative flex items-center justify-center">
                      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                        <circle cx="56" cy="56" r="48" stroke="var(--line-border)" strokeWidth="7" fill="none" />
                        <circle
                          cx="56" cy="56" r="48"
                          stroke={evaluation.totalScore >= 80 ? 'var(--color-brand)' : evaluation.totalScore >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'}
                          strokeWidth="7" fill="none" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 48}
                          strokeDashoffset={((100 - evaluation.totalScore) / 100) * (2 * Math.PI * 48)}
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="font-serif text-3xl font-black text-ink">{evaluation.totalScore}</span>
                        <p className="text-[10px] font-bold text-faint">/100</p>
                      </div>
                    </div>
                    <span className={cn(
                      'mt-4 px-3 py-1 rounded-full text-xs font-bold border',
                      evaluation.totalScore >= 80 ? 'border-brand/20 text-brand bg-brand/10' :
                      evaluation.totalScore >= 60 ? 'border-warning/20 text-warning bg-warning/10' :
                      'border-danger/20 text-danger bg-danger/10'
                    )}>
                      {evaluation.grade}
                    </span>
                    {evaluation.encouragement && (
                      <p className="mt-3 text-xs text-muted leading-relaxed">{evaluation.encouragement}</p>
                    )}
                  </div>

                  {/* Speech Fluency card */}
                  <div className="card p-6 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                      <Icon.Mic size={14} className="text-muted" /> Speech Fluency
                    </h4>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-line bg-canvas p-3 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-faint">Speaking Pace</p>
                          <p className="text-sm font-semibold text-ink mt-0.5">{wpm} WPM</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: `color-mix(in srgb, ${paceColor} 15%, transparent)`, color: paceColor }}>
                          {paceStatus}
                        </span>
                      </div>
                      <div className="rounded-xl border border-line bg-canvas p-3 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-faint">Filler Words</p>
                          <p className="text-sm font-semibold text-ink mt-0.5">{fillers} detected</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: fillers > 3 ? 'color-mix(in srgb, var(--color-danger) 15%, transparent)' : 'color-mix(in srgb, var(--color-brand) 15%, transparent)', color: fillers > 3 ? 'var(--color-danger)' : 'var(--color-brand)' }}>
                          {fillers > 3 ? 'High' : 'Optimal'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed feedback + Rubric table */}
                <div className="card p-8 space-y-6">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Icon.Shield size={16} className="text-muted" /> AI Evaluation Report
                  </h3>

                  {/* Rubric Table */}
                  <div className="overflow-hidden rounded-xl border border-line">
                    <table className="min-w-full divide-y divide-line">
                      <thead className="bg-canvas">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-faint">Evaluated Metric</th>
                          <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-faint">Score</th>
                          <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-faint">Max</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line bg-surface text-xs">
                        {Object.entries(evaluation.scores || {}).map(([metric, score]) => {
                          const maxVal = metric === 'depth' ? 40 : 30;
                          return (
                            <tr key={metric}>
                              <td className="px-4 py-2.5 font-medium text-ink capitalize">{metric}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-ink">{score}</td>
                              <td className="px-4 py-2.5 text-right text-faint">{maxVal}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {evaluation.strengths?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-brand mb-2">What you did well</p>
                      <ul className="space-y-1.5">
                        {evaluation.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted">
                            <Icon.Check size={14} className="text-brand shrink-0 mt-0.5" /> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evaluation.improvements?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-danger mb-2">What to improve</p>
                      <ul className="space-y-1.5">
                        {evaluation.improvements.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted">
                            <Icon.ArrowRight size={14} className="text-danger shrink-0 mt-0.5" /> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evaluation.modelAnswer && (
                    <div className="rounded-lg border border-line bg-surface-2 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-faint mb-2">Model Answer Approach</p>
                      <p className="text-xs text-muted leading-relaxed">{evaluation.modelAnswer}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 card px-6 py-5">
                <button
                  onClick={endSession}
                  className="w-full sm:w-auto h-10 px-6 rounded-xl border border-line text-sm font-medium text-muted hover:bg-surface-2 transition-colors"
                >
                  End Session
                </button>
                <button
                  onClick={nextQuestion}
                  className="w-full sm:w-auto h-10 px-6 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-soft transition-colors flex items-center justify-center gap-2"
                >
                  <Icon.ArrowRight size={15} /> Next Question
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── SAVING ── */}
        {savingSession && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">Saving your session...</p>
          </div>
        )}

        {/* ── SESSION COMPLETE ── */}
        {stage === 'complete' && !savingSession && (
          <div className="max-w-2xl mx-auto">
            <div className="auth-brand-panel border border-white/10 rounded-2xl p-10 text-white text-center relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-56 h-56 bg-brand opacity-40 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/60 border border-brand/80 mx-auto mb-6">
                  <Icon.Shield size={28} className="text-white/70" />
                </span>
                <h2 className="font-serif text-3xl font-black text-white mb-2">Session Complete</h2>
                <p className="text-sm text-white/60 mb-8">Great work, {user?.name?.split(' ')[0]}. Your results have been saved.</p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { label: 'Avg Score', value: avgScore !== null ? `${avgScore}/100` : '—' },
                    { label: 'Questions', value: sessionLog.length },
                    { label: 'Gaps Covered', value: [...new Set(sessionLog.map(q => q.gapAddressed).filter(Boolean))].length },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-white/5 border border-white/10 px-4 py-4">
                      <p className="font-serif text-2xl font-black text-white">{value}</p>
                      <p className="text-xs text-white/60 mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={resetSession}
                    className="h-10 px-6 rounded-xl border border-white/20 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    New Session
                  </button>
                  <a
                    href="/execution-engine"
                    className="h-10 px-6 rounded-xl bg-white text-sm font-bold text-ink hover:bg-surface-2 transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon.Route size={15} /> View My Roadmap
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}

      </div>
    </AppShell>
  );
}
