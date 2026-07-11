import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/icons';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';

/* ── Minimal markdown renderer ── */
function renderMd(text = '') {
  return text.split('\n').map((line, idx) => {
    const clean = line.trim();
    if (clean.startsWith('###'))
      return <h4 key={idx} className="text-sm font-bold text-[#171717] mt-3 mb-1">{clean.replace('###', '').trim()}</h4>;
    if (clean.startsWith('-'))
      return <li key={idx} className="text-sm text-[#525252] list-disc ml-4 my-0.5">{clean.slice(1).trim()}</li>;
    return line ? <p key={idx} className="text-sm text-[#525252] my-1 leading-relaxed">{clean}</p> : <div key={idx} className="h-2" />;
  });
}

export default function InterviewPrepPage() {
  const { user } = useAuth();
  const [stage, setStage] = useState('setup');
  const [questionText, setQuestionText] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evaluationText, setEvaluationText] = useState('');
  const [evaluationScore, setEvaluationScore] = useState(null);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef(null);

  const targetRole = user?.profile?.dreamRole || 'Software Engineer';

  /* ── Timer ── */
  const startTimer = () => {
    setSecondsElapsed(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
  };
  const stopTimer = () => clearInterval(timerRef.current);
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  /* ── Speech API ── */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onstart = () => { setIsListening(true); setSpeechError(''); };
    r.onerror = (e) => {
      setSpeechError(e.error === 'not-allowed'
        ? 'Microphone blocked. Enable permissions in browser settings.'
        : `Error: ${e.error}`);
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
    if (!recognitionRef.current) {
      setSpeechError('Web Speech API not supported. Use Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setSpeechError('');
      try { recognitionRef.current.start(); } catch { recognitionRef.current.stop(); }
    }
  };

  /* ── Interview logic ── */
  const startInterview = async () => {
    setError(''); setSubmitting(true); setResponseText(''); setStage('active'); startTimer();
    try {
      const { data } = await api.post('/ai-coach/chat', { message: 'mock interview', history: [] });
      const res = data.data.response || '';
      const idx = res.indexOf('### ⚡ MOCK INTERVIEW QUESTION');
      setQuestionText(idx !== -1 ? res.substring(idx) : res);
      setChatHistory([{ role: 'user', content: 'mock interview' }, { role: 'assistant', content: res }]);
    } catch (err) {
      setError(errorMessage(err, 'Could not load question.'));
      setStage('setup'); stopTimer();
    } finally { setSubmitting(false); }
  };

  const submitAnswer = async () => {
    if (!responseText.trim()) return;
    if (isListening) recognitionRef.current?.stop();
    setError(''); setSubmitting(true); stopTimer();
    const history = [...chatHistory, { role: 'user', content: responseText }];
    try {
      const { data } = await api.post('/ai-coach/chat', { message: responseText, history });
      const res = data.data.response || '';
      setEvaluationText(res);
      const m = res.match(/AI Rating:\s*`?(\d+)\/100`?/i);
      setEvaluationScore(m ? parseInt(m[1], 10) : 75);
      setChatHistory([...history, { role: 'assistant', content: res }]);
      setStage('evaluation');
    } catch (err) {
      setError(errorMessage(err, 'Evaluation failed.')); startTimer();
    } finally { setSubmitting(false); }
  };

  const nextQuestion = async () => {
    setError(''); setSubmitting(true); setResponseText(''); setStage('active'); startTimer();
    const history = [...chatHistory, { role: 'user', content: 'next question' }];
    try {
      const { data } = await api.post('/ai-coach/chat', { message: 'next question', history });
      const res = data.data.response || '';
      const idx = res.indexOf('### ⚡ MOCK INTERVIEW QUESTION');
      setQuestionText(idx !== -1 ? res.substring(idx) : res);
      setChatHistory([...history, { role: 'assistant', content: res }]);
    } catch (err) {
      setError(errorMessage(err, 'Could not load next question.')); setStage('evaluation'); stopTimer();
    } finally { setSubmitting(false); }
  };

  const endSession = () => {
    setStage('setup'); setChatHistory([]); setQuestionText('');
    setResponseText(''); setEvaluationText(''); setEvaluationScore(null); stopTimer();
  };

  return (
    <AppShell>
      <div className="space-y-8">

        {/* ── Editorial header ── */}
        <div className="relative rounded-2xl overflow-hidden min-h-[200px] flex items-end">
          <img
            src="https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1400&q=80&fit=crop"
            alt="Professional meeting"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171717]/80 via-[#171717]/30 to-transparent" />
          <div className="relative z-10 px-8 py-8">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Interview Prep</p>
            <h1 className="font-serif text-3xl font-black text-white leading-tight">AI Coaching Session</h1>
            <p className="mt-2 text-sm text-white/70">Role-specific questions · STAR-method evaluation · Voice dictation</p>
          </div>
          {stage === 'active' && (
            <div className="absolute top-5 right-5 z-10">
              <span className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 text-sm font-mono font-bold text-white">
                <span className="h-2 w-2 rounded-full bg-[#ef4444] animate-pulse" />
                {formatTime(secondsElapsed)}
              </span>
            </div>
          )}
        </div>

        {/* ── Error ── */}
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
                The AI will generate a role-specific question for{' '}
                <span className="font-semibold text-[#171717]">{targetRole}</span>.
                Respond by typing or using voice dictation.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-4 text-left max-w-md mx-auto">
                <div className="rounded-xl border border-[#EAEAE5] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">Evaluation</p>
                  <p className="mt-1 text-sm font-semibold text-[#171717]">STAR Method + Keywords</p>
                </div>
                <div className="rounded-xl border border-[#EAEAE5] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">Target Role</p>
                  <p className="mt-1 text-sm font-semibold text-[#171717]">{targetRole}</p>
                </div>
              </div>

              <button
                onClick={startInterview}
                disabled={submitting}
                className="mt-8 h-12 px-10 rounded-xl bg-[#171717] text-white font-semibold hover:bg-[#2a2a2a] disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
              >
                {submitting ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Preparing…</> : 'Start Session'}
              </button>
            </div>
          </div>
        )}

        {/* ── ACTIVE ── */}
        {stage === 'active' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            {/* Question */}
            <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#2B4C3F] bg-[#F0F5F3] border border-[#C8DDD6] px-2.5 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2B4C3F] animate-pulse" /> Active Question
                </span>
              </div>
              <div className="prose-sm text-[#171717] leading-relaxed">
                {renderMd(questionText)}
              </div>
            </div>

            {/* Response Console */}
            <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8 flex flex-col">
              <div className="flex items-center justify-between border-b border-[#EAEAE5] pb-4 mb-5">
                <h3 className="text-sm font-bold text-[#171717]">Your Response</h3>
                <div className="flex items-center gap-2">
                  {isListening && (
                    <span className="text-xs font-semibold text-[#B85A3C] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#B85A3C] animate-pulse" />
                      Listening…
                    </span>
                  )}
                  <button
                    onClick={toggleListening}
                    title={isListening ? 'Stop Recording' : 'Voice Input'}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                      isListening
                        ? 'border-[#E8C4B8] bg-[#FDF5F3] text-[#B85A3C]'
                        : 'border-[#EAEAE5] bg-white text-[#525252] hover:bg-[#F5F5F3]'
                    )}
                  >
                    <Icon.Compass size={14} className="rotate-45" />
                  </button>
                </div>
              </div>

              {speechError && (
                <p className="text-xs text-[#B85A3C] mb-4 pl-3 border-l-2 border-[#B85A3C]">{speechError}</p>
              )}

              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Type your answer here, or click the mic to dictate…"
                disabled={submitting}
                className="flex-1 min-h-[200px] resize-none rounded-xl border border-[#EAEAE5] bg-[#FBFBFA] p-4 text-sm text-[#171717] placeholder-[#D0D0CA] focus:outline-none focus:border-[#2B4C3F] focus:ring-2 focus:ring-[#2B4C3F]/10 transition-colors"
              />

              <div className="flex items-center justify-between mt-5 pt-5 border-t border-[#EAEAE5]">
                <button
                  onClick={endSession}
                  disabled={submitting}
                  className="text-sm text-[#A3A3A3] hover:text-[#B85A3C] transition-colors"
                >
                  Cancel session
                </button>
                <button
                  onClick={submitAnswer}
                  disabled={submitting || !responseText.trim()}
                  className="h-10 px-6 rounded-xl bg-[#171717] text-white text-sm font-semibold hover:bg-[#2a2a2a] disabled:opacity-40 transition-colors flex items-center gap-2"
                >
                  {submitting
                    ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Evaluating…</>
                    : 'Submit Answer'
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EVALUATION ── */}
        {stage === 'evaluation' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid gap-6 md:grid-cols-[200px_1fr]">
              {/* Score */}
              <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-4">Interview Score</p>
                <div className="relative flex items-center justify-center">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r="48" stroke="#EAEAE5" strokeWidth="7" fill="none" />
                    <circle
                      cx="56" cy="56" r="48"
                      stroke={evaluationScore >= 80 ? '#2B4C3F' : evaluationScore >= 60 ? '#92400E' : '#B85A3C'}
                      strokeWidth="7" fill="none" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={((100 - (evaluationScore || 0)) / 100) * (2 * Math.PI * 48)}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="font-serif text-3xl font-black text-[#171717]">{evaluationScore}</span>
                    <p className="text-[10px] font-bold text-[#A3A3A3]">/100</p>
                  </div>
                </div>
                <span className={cn(
                  'mt-4 px-3 py-1 rounded-full text-xs font-bold border',
                  evaluationScore >= 80 ? 'border-[#C8DDD6] text-[#2B4C3F] bg-[#F0F5F3]' :
                  evaluationScore >= 60 ? 'border-[#E8D8A8] text-[#92400E] bg-[#FEFBF0]' :
                  'border-[#E8C4B8] text-[#B85A3C] bg-[#FDF5F3]'
                )}>
                  {evaluationScore >= 80 ? 'Excellent' : evaluationScore >= 60 ? 'Passing' : 'Needs Work'}
                </span>
              </div>

              {/* Feedback */}
              <div className="bg-white border border-[#EAEAE5] rounded-2xl p-8">
                <h3 className="text-sm font-bold text-[#171717] mb-5 flex items-center gap-2">
                  <Icon.Shield size={16} className="text-[#2B4C3F]" /> AI Evaluation Report
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {renderMd(evaluationText)}
                </div>
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
                disabled={submitting}
                className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#171717] text-white text-sm font-semibold hover:bg-[#2a2a2a] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Loading…</>
                  : 'Next Question →'
                }
              </button>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
