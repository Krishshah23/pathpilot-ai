import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';

export default function InterviewPrepPage() {
  const { user } = useAuth();
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
  const keyGaps = resume?.keyGaps || [];

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

  const startSession = () => {
    setQuestionsAsked([]); setSessionScores([]); setSessionLog([]); setGapIndex(0);
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

        {/* ── Hero ── */}
        <div className="relative rounded-2xl overflow-hidden min-h-[200px] flex items-end">
          <img
            src="https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1400&q=80&fit=crop"
            alt="Interview coaching"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171717]/80 via-[#171717]/30 to-transparent" />
          <div className="relative z-10 px-8 py-8">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Interview Prep</p>
            <h1 className="font-serif text-3xl font-black text-white">AI Coaching Session</h1>
            <p className="mt-2 text-sm text-white/70">
              Questions generated from your resume gaps · Gemini evaluation · Voice dictation
            </p>
          </div>
          {stage === 'active' && (
            <div className="absolute top-5 right-5 z-10">
              <span className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 text-sm font-mono font-bold text-white">
                <span className="h-2 w-2 rounded-full bg-[#ef4444] animate-pulse" />
                {fmt(secondsElapsed)}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#E8C4B8] bg-[#FDF5F3] px-4 py-3 text-sm text-[#B85A3C]">
            <Icon.AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* ── SETUP ── */}
        {stage === 'setup' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-[#EAEAE5] rounded-2xl p-10 text-center">
              <h2 className="font-serif text-2xl font-bold text-[#171717]">Ready to practice?</h2>
              <p className="mt-3 text-sm text-[#525252] max-w-md mx-auto leading-relaxed">
                Gemini will generate questions targeting your actual resume gaps for{' '}
                <span className="font-semibold text-[#171717]">{targetRole}</span>.
              </p>

              {/* Gap preview */}
              {loadingResume ? (
                <div className="mt-6 flex justify-center"><Spinner className="h-5 w-5 text-[#2B4C3F]" /></div>
              ) : keyGaps.length > 0 ? (
                <div className="mt-6 text-left rounded-xl border border-[#E8C4B8] bg-[#FDF5F3] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B85A3C] mb-2">
                    {keyGaps.length} gap{keyGaps.length > 1 ? 's' : ''} identified — questions will target these
                  </p>
                  {keyGaps.slice(0, 3).map((gap, i) => (
                    <p key={i} className="text-xs text-[#525252] mt-1 flex items-start gap-1.5">
                      <span className="font-bold text-[#B85A3C] shrink-0">{i + 1}.</span> {gap}
                    </p>
                  ))}
                  {keyGaps.length > 3 && <p className="text-xs text-[#A3A3A3] mt-1">+{keyGaps.length - 3} more</p>}
                </div>
              ) : (
                <div className="mt-6 text-left rounded-xl border border-[#EAEAE5] bg-[#F5F5F3] p-4">
                  <p className="text-xs text-[#525252]">
                    {resume
                      ? 'No specific gaps detected — general role questions will be generated.'
                      : 'No resume analyzed yet — questions will be based on your target role only. Upload a resume for gap-specific practice.'}
                  </p>
                </div>
              )}

              <div className="mt-6 grid sm:grid-cols-3 gap-3 text-left max-w-md mx-auto">
                {[
                  { label: 'Target Role', value: targetRole },
                  { label: 'Evaluation', value: 'Gemini AI' },
                  { label: 'Questions', value: keyGaps.length > 0 ? 'Gap-targeted' : 'Role-based' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-[#EAEAE5] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">{label}</p>
                    <p className="mt-1 text-xs font-semibold text-[#171717]">{value}</p>
                  </div>
                ))}
              </div>

              {avgScore !== null && (
                <p className="mt-4 text-xs text-[#525252]">
                  Session avg so far: <span className="font-bold text-[#2B4C3F]">{avgScore}/100</span> ({sessionScores.length} question{sessionScores.length > 1 ? 's' : ''})
                </p>
              )}

              <button
                onClick={startSession}
                className="mt-8 h-12 px-10 rounded-xl bg-[#171717] text-white font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center gap-2 mx-auto"
              >
                <Icon.Sparkles size={16} /> Start Session
              </button>
            </div>
          </div>
        )}

        {/* ── PAST SESSIONS ── */}
        {stage === 'setup' && !loadingSessions && pastSessions.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-[#EAEAE5] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon.History size={16} className="text-[#525252]" />
                <h3 className="font-semibold text-sm text-[#171717]">Past Sessions</h3>
                <span className="ml-auto text-[10px] text-[#A3A3A3]">{pastSessions.length} session{pastSessions.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {pastSessions.slice(0, 5).map((s) => {
                  const date = new Date(s.completedAt || s.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  });
                  const scoreColor = s.averageScore >= 75 ? '#22c55e' : s.averageScore >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={s._id} className="flex items-center gap-4 rounded-xl border border-[#EAEAE5] bg-[#F9F9F8] px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                        style={{ backgroundColor: `${scoreColor}18` }}>
                        <span className="text-sm font-bold" style={{ color: scoreColor }}>{s.averageScore}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#171717] truncate">{s.targetRole}</p>
                        <p className="text-[10px] text-[#A3A3A3] mt-0.5">
                          {s.totalQuestions} question{s.totalQuestions !== 1 ? 's' : ''}
                          {s.gapsAddressed?.length > 0 && ` · ${s.gapsAddressed.length} gap${s.gapsAddressed.length !== 1 ? 's' : ''} covered`}
                        </p>
                      </div>
                      <span className="text-[10px] text-[#A3A3A3] shrink-0">{date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner className="h-8 w-8 text-[#2B4C3F]" />
            <p className="text-sm text-[#525252]">Gemini is preparing your question…</p>
          </div>
        )}

        {/* ── ACTIVE ── */}
        {stage === 'active' && questionData && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            {/* Question card */}
            <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8 space-y-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#2B4C3F] bg-[#F0F5F3] border border-[#C8DDD6] px-2.5 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2B4C3F] animate-pulse" /> Live Question
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] bg-[#F5F5F3] border border-[#EAEAE5] px-2 py-1 rounded-full">
                  {questionData.questionType}
                </span>
              </div>

              <p className="text-sm font-semibold text-[#171717] leading-relaxed">{questionData.question}</p>

              {questionData.gapAddressed && (
                <div className="rounded-lg border border-[#E8C4B8] bg-[#FDF5F3] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B85A3C] mb-1">Testing gap</p>
                  <p className="text-xs text-[#525252]">{questionData.gapAddressed}</p>
                </div>
              )}

              {questionData.hint && (
                <details className="group">
                  <summary className="text-xs text-[#A3A3A3] cursor-pointer hover:text-[#525252] transition-colors">
                    💡 Show hint
                  </summary>
                  <p className="mt-2 text-xs text-[#525252] pl-4 border-l-2 border-[#EAEAE5]">{questionData.hint}</p>
                </details>
              )}
            </div>

            {/* Response console */}
            <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8 flex flex-col">
              <div className="flex items-center justify-between border-b border-[#EAEAE5] pb-4 mb-5">
                <h3 className="text-sm font-bold text-[#171717]">Your Response</h3>
                <div className="flex items-center gap-2">
                  {isListening && (
                    <span className="text-xs font-semibold text-[#B85A3C] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#B85A3C] animate-pulse" /> Listening…
                    </span>
                  )}
                  <button
                    onClick={toggleListening}
                    title={isListening ? 'Stop' : 'Voice input'}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                      isListening
                        ? 'border-[#E8C4B8] bg-[#FDF5F3] text-[#B85A3C]'
                        : 'border-[#EAEAE5] bg-white text-[#525252] hover:bg-[#F5F5F3]'
                    )}
                  >
                    <Icon.Mic size={14} />
                  </button>
                </div>
              </div>

              {speechError && <p className="text-xs text-[#B85A3C] mb-4 pl-3 border-l-2 border-[#B85A3C]">{speechError}</p>}

              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Type your answer here, or click the mic to dictate…"
                className="flex-1 min-h-[200px] resize-none rounded-xl border border-[#EAEAE5] bg-[#FBFBFA] p-4 text-sm text-[#171717] placeholder-[#D0D0CA] focus:outline-none focus:border-[#2B4C3F] focus:ring-2 focus:ring-[#2B4C3F]/10 transition-colors"
              />

              <div className="flex items-center justify-between mt-5 pt-5 border-t border-[#EAEAE5]">
                <button onClick={endSession} className="text-sm text-[#A3A3A3] hover:text-[#B85A3C] transition-colors">
                  End session
                </button>
                <button
                  onClick={submitAnswer}
                  disabled={!responseText.trim()}
                  className="h-10 px-6 rounded-xl bg-[#171717] text-white text-sm font-semibold hover:bg-[#2a2a2a] disabled:opacity-40 transition-colors"
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
            <Spinner className="h-8 w-8 text-[#2B4C3F]" />
            <p className="text-sm text-[#525252]">Gemini is evaluating your answer…</p>
          </div>
        )}

        {/* ── RESULT ── */}
        {stage === 'result' && evaluation && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid gap-6 md:grid-cols-[200px_1fr]">
              {/* Score gauge */}
              <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-4">Score</p>
                <div className="relative flex items-center justify-center">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r="48" stroke="#EAEAE5" strokeWidth="7" fill="none" />
                    <circle
                      cx="56" cy="56" r="48"
                      stroke={evaluation.totalScore >= 80 ? '#2B4C3F' : evaluation.totalScore >= 60 ? '#92400E' : '#B85A3C'}
                      strokeWidth="7" fill="none" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={((100 - evaluation.totalScore) / 100) * (2 * Math.PI * 48)}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="font-serif text-3xl font-black text-[#171717]">{evaluation.totalScore}</span>
                    <p className="text-[10px] font-bold text-[#A3A3A3]">/100</p>
                  </div>
                </div>
                <span className={cn(
                  'mt-4 px-3 py-1 rounded-full text-xs font-bold border',
                  evaluation.totalScore >= 80 ? 'border-[#C8DDD6] text-[#2B4C3F] bg-[#F0F5F3]' :
                  evaluation.totalScore >= 60 ? 'border-[#E8D8A8] text-[#92400E] bg-[#FEFBF0]' :
                  'border-[#E8C4B8] text-[#B85A3C] bg-[#FDF5F3]'
                )}>
                  {evaluation.grade}
                </span>
                {evaluation.encouragement && (
                  <p className="mt-3 text-xs text-[#525252] leading-relaxed">{evaluation.encouragement}</p>
                )}
              </div>

              {/* Detailed feedback */}
              <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8 space-y-5">
                <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                  <Icon.Shield size={16} className="text-[#2B4C3F]" /> AI Evaluation Report
                </h3>

                {evaluation.strengths?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#2B4C3F] mb-2">What you did well</p>
                    <ul className="space-y-1.5">
                      {evaluation.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#525252]">
                          <Icon.Check size={14} className="text-[#2B4C3F] shrink-0 mt-0.5" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.improvements?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#B85A3C] mb-2">What to improve</p>
                    <ul className="space-y-1.5">
                      {evaluation.improvements.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#525252]">
                          <Icon.ArrowRight size={14} className="text-[#B85A3C] shrink-0 mt-0.5" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.modelAnswer && (
                  <div className="rounded-lg border border-[#EAEAE5] bg-[#F5F5F3] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Model Answer Approach</p>
                    <p className="text-xs text-[#525252] leading-relaxed">{evaluation.modelAnswer}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-[#EAEAE5] rounded-2xl px-6 py-5">
              <button
                onClick={endSession}
                className="w-full sm:w-auto h-10 px-6 rounded-xl border border-[#EAEAE5] text-sm font-medium text-[#525252] hover:bg-[#F5F5F3] transition-colors"
              >
                End Session
              </button>
              <button
                onClick={nextQuestion}
                className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#171717] text-white text-sm font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center justify-center gap-2"
              >
                <Icon.ArrowRight size={15} /> Next Question
              </button>
            </div>
          </div>
        )}

        {/* ── SAVING ── */}
        {savingSession && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner className="h-8 w-8 text-[#2B4C3F]" />
            <p className="text-sm text-[#525252]">Saving your session...</p>
          </div>
        )}

        {/* ── SESSION COMPLETE ── */}
        {stage === 'complete' && !savingSession && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-[#171717] rounded-2xl p-10 text-white text-center relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-56 h-56 bg-[#2B4C3F] opacity-30 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2B4C3F] mx-auto mb-6">
                  <Icon.Shield size={28} className="text-white" />
                </span>
                <h2 className="font-serif text-3xl font-black text-white mb-2">Session Complete</h2>
                <p className="text-sm text-white/70 mb-8">Great work, {user?.name?.split(' ')[0]}. Your results have been saved.</p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { label: 'Avg Score', value: avgScore !== null ? `${avgScore}/100` : '—' },
                    { label: 'Questions', value: sessionLog.length },
                    { label: 'Gaps Covered', value: [...new Set(sessionLog.map(q => q.gapAddressed).filter(Boolean))].length },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-white/10 px-4 py-4">
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
                    className="h-10 px-6 rounded-xl bg-white text-sm font-bold text-[#171717] hover:bg-[#F5F5F3] transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon.Map size={15} /> View My Roadmap
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
