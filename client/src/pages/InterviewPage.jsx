import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, errorMessage } from '@/lib/api';
import { Icon } from '@/components/ui/icons';

function renderFormattedText(text = '') {
  const parts = text.split('**');
  if (parts.length === 1) return text;
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="text-ink font-bold">{part}</strong> : part));
}

// Simple Markdown mini-parser to render bold, bullet points and headers
function renderResponseMarkdown(text = '') {
  return text.split('\n').map((line, idx) => {
    let cleanLine = line.trim();
    if (cleanLine.startsWith('###')) {
      return (
        <h4 key={idx} className="text-sm font-semibold text-ink mt-3 mb-1 first:mt-0">
          {renderFormattedText(cleanLine.replace('###', '').trim())}
        </h4>
      );
    }
    if (cleanLine.startsWith('-')) {
      return (
        <li key={idx} className="text-xs text-muted list-disc ml-4 my-1">
          {renderFormattedText(cleanLine.substring(1).trim())}
        </li>
      );
    }
    return line ? (
      <p key={idx} className="text-xs text-muted my-1">
        {renderFormattedText(cleanLine)}
      </p>
    ) : (
      <div key={idx} className="h-2" />
    );
  });
}

export default function InterviewPage() {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Interview state
  const [stage, setStage] = useState('setup'); // setup, active, evaluation
  const [questionText, setQuestionText] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evaluationText, setEvaluationText] = useState('');
  const [evaluationScore, setEvaluationScore] = useState(null);
  const [error, setError] = useState('');

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef(null);

  // Timer state
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await api.get('/profile');
        setProfile(data.data.user);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  // Timer handlers
  const startTimer = () => {
    setSecondsElapsed(0);
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerIntervalRef.current);
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Web Speech API / Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError('');
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access blocked. Enable permissions in your browser settings.');
        } else {
          setSpeechError(`Voice input error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setResponseText(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + finalTranscript);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError('Web Speech API is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setSpeechError('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
        recognitionRef.current.stop();
      }
    }
  };

  // Launch interview question
  const startInterview = async () => {
    setError('');
    setSubmitting(true);
    setResponseText('');
    setStage('active');
    startTimer();

    try {
      const { data } = await api.post('/ai-coach/chat', {
        message: 'mock interview',
        history: []
      });

      const response = data.data.response || '';
      
      // Isolate the question text from greeting
      const qIndex = response.indexOf('### ⚡ MOCK INTERVIEW QUESTION');
      let isolatedQuestion = response;
      if (qIndex !== -1) {
        isolatedQuestion = response.substring(qIndex);
      }

      setQuestionText(isolatedQuestion);
      setChatHistory([
        { role: 'user', content: 'mock interview' },
        { role: 'assistant', content: response }
      ]);
    } catch (err) {
      setError(errorMessage(err, 'Could not load interview question.'));
      setStage('setup');
      stopTimer();
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Answer
  const submitAnswer = async () => {
    if (!responseText.trim()) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setError('');
    setSubmitting(true);
    stopTimer();

    const updatedHistory = [
      ...chatHistory,
      { role: 'user', content: responseText }
    ];

    try {
      const { data } = await api.post('/ai-coach/chat', {
        message: responseText,
        history: updatedHistory
      });

      const response = data.data.response || '';
      setEvaluationText(response);

      // Extract rating score from response (e.g. AI Rating: `95/100`)
      const scoreMatch = response.match(/AI Rating:\s*`?(\d+)\/100`?/i);
      if (scoreMatch && scoreMatch[1]) {
        setEvaluationScore(parseInt(scoreMatch[1], 10));
      } else {
        setEvaluationScore(75); // fallback default
      }

      setChatHistory([
        ...updatedHistory,
        { role: 'assistant', content: response }
      ]);
      setStage('evaluation');
    } catch (err) {
      setError(errorMessage(err, 'Failed to evaluate response.'));
      startTimer(); // resume timer on error
    } finally {
      setSubmitting(false);
    }
  };

  // Load next question
  const nextQuestion = async () => {
    setError('');
    setSubmitting(true);
    setResponseText('');
    setStage('active');
    startTimer();

    const updatedHistory = [
      ...chatHistory,
      { role: 'user', content: 'next question' }
    ];

    try {
      const { data } = await api.post('/ai-coach/chat', {
        message: 'next question',
        history: updatedHistory
      });

      const response = data.data.response || '';
      const qIndex = response.indexOf('### ⚡ MOCK INTERVIEW QUESTION');
      let isolatedQuestion = response;
      if (qIndex !== -1) {
        isolatedQuestion = response.substring(qIndex);
      }

      setQuestionText(isolatedQuestion);
      setChatHistory([
        ...updatedHistory,
        { role: 'assistant', content: response }
      ]);
    } catch (err) {
      setError(errorMessage(err, 'Could not load next question.'));
      setStage('evaluation');
      stopTimer();
    } finally {
      setSubmitting(false);
    }
  };

  const endSession = () => {
    setStage('setup');
    setChatHistory([]);
    setQuestionText('');
    setResponseText('');
    setEvaluationText('');
    setEvaluationScore(null);
    stopTimer();
  };

  if (loadingProfile) {
    return (
      <AppShell title="AI Mock Interview Coach">
        <div className="flex h-[400px] items-center justify-center">
          <Icon.Clock className="h-8 w-8 animate-spin text-brand" />
        </div>
      </AppShell>
    );
  }

  const targetRole = profile?.profile?.dreamRole || 'Software Engineer';
  const detectedSkills = profile?.profile?.skills || [];

  return (
    <AppShell title="Mock Interview Room" subtitle="Dynamic AI interview coaching with Web Speech dictation">
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            <Icon.AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* ---------------- STAGE 1: SETUP/INTRO ---------------- */}
        {stage === 'setup' && (
          <Card className="max-w-2xl mx-auto border border-line bg-surface/30 p-8 backdrop-blur-md">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Icon.MessageSquare size={32} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">AI Mock Interview Console</h2>
                <p className="mt-2 text-sm text-muted max-w-md">
                  Practice responding to job-specific behavioral, technical, and engineering system architecture questions.
                </p>
              </div>

              <div className="w-full grid gap-4 sm:grid-cols-2 text-left pt-2 border-t border-line/40">
                <div className="p-4 rounded-xl bg-surface-2/40 border border-line/20">
                  <p className="text-[10px] text-faint uppercase font-bold tracking-wider">Target Domain</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{targetRole}</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-2/40 border border-line/20">
                  <p className="text-[10px] text-faint uppercase font-bold tracking-wider">Evaluation Protocol</p>
                  <p className="mt-1 text-sm font-semibold text-ink">STAR-Method & Keywords</p>
                </div>
              </div>

              <div className="w-full text-left space-y-2">
                <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Icon.Info size={14} className="text-brand" /> Instructions:
                </p>
                <ul className="text-xs text-muted space-y-1.5 list-disc pl-5">
                  <li>Speak or type your response clearly.</li>
                  <li>Include specific technical keywords from your target tech stack.</li>
                  <li>Aim to describe the Situation, Task, Action, and Quantitative Result.</li>
                </ul>
              </div>

              <Button
                className="w-full sm:w-auto px-8"
                onClick={startInterview}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Icon.Clock className="mr-2 h-4 w-4 animate-spin" /> Preparing question...
                  </>
                ) : (
                  <>Start Simulation</>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* ---------------- STAGE 2: ACTIVE CONSOLE ---------------- */}
        {stage === 'active' && (
          <div className="grid gap-6 lg:grid-cols-12 max-w-6xl mx-auto">
            {/* Left Column: Simulated Interviewer and Question */}
            <div className="lg:col-span-5 space-y-6">
              {/* Simulated Feed */}
              <Card className="relative aspect-video flex flex-col items-center justify-center bg-gradient-to-b from-brand/10 to-surface border border-line overflow-hidden">
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface/80 border border-line backdrop-blur-sm z-20">
                  <span className="h-2 w-2 rounded-full bg-danger animate-pulse"></span>
                  <span className="text-[10px] font-mono font-bold text-ink tracking-wider uppercase">Live Feed</span>
                </div>

                <div className="absolute top-3 right-3 text-xs font-mono font-bold text-muted bg-surface/80 px-2 py-0.5 rounded border border-line">
                  {formatTime(secondsElapsed)}
                </div>

                {/* Animated Pulsing Ring representing AI Voice/Speaker */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-24 w-24 rounded-full bg-brand/5 border border-brand/20 animate-ping opacity-60"></div>
                  <div className="absolute h-16 w-16 rounded-full bg-brand/10 border border-brand/30 animate-pulse"></div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white z-10 shadow-lg">
                    <Icon.Sparkles size={20} className="animate-spin-slow" />
                  </div>
                </div>

                <p className="mt-4 text-xs font-semibold text-muted">PathPilot AI Interviewer</p>
              </Card>

              {/* Current Question */}
              <Card className="border border-brand/20 bg-brand/5 p-5">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full border border-brand/20">
                    <Icon.MessageSquare size={10} /> Active Prompt
                  </span>
                  <div className="text-sm font-medium text-ink leading-relaxed">
                    {renderResponseMarkdown(questionText)}
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: User Answer Console */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="flex flex-col h-full border border-line bg-surface/20 p-6">
                <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                  <h3 className="font-display font-semibold text-ink">Your Response Console</h3>
                  
                  {/* Web Speech Trigger */}
                  <div className="flex items-center gap-2">
                    {isListening && (
                      <span className="text-[10px] text-brand font-bold animate-pulse">
                        Listening (Speak now)...
                      </span>
                    )}
                    <button
                      onClick={toggleListening}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                        isListening
                          ? 'bg-danger/10 border-danger/40 text-danger hover:bg-danger/20'
                          : 'bg-brand/10 border-brand/20 text-brand hover:bg-brand/20'
                      }`}
                      title={isListening ? 'Stop Recording' : 'Voice Input (Dictation)'}
                    >
                      {isListening ? <span className="h-2 w-2 rounded-full bg-danger animate-ping"></span> : <Icon.Compass size={14} className="rotate-45" />}
                    </button>
                  </div>
                </div>

                {speechError && (
                  <p className="text-xs text-danger mb-3 border-l-2 border-danger pl-2">{speechError}</p>
                )}

                {/* Answer Workspace */}
                <div className="flex-1 min-h-[220px] relative">
                  {isListening && (
                    <div className="absolute inset-0 bg-brand/5 border border-brand/30 rounded-xl flex items-center justify-center z-10 backdrop-blur-[1px]">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-3 w-1 bg-brand rounded animate-pulse" style={{ animationDelay: '0.1s' }}></span>
                          <span className="h-5 w-1 bg-brand rounded animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                          <span className="h-3 w-1 bg-brand rounded animate-pulse" style={{ animationDelay: '0.3s' }}></span>
                        </div>
                        <p className="text-xs font-semibold text-brand">Transcribing your voice live...</p>
                        <Button size="sm" variant="outline" className="mt-1 h-7 text-[10px] border-danger/30 text-danger" onClick={() => recognitionRef.current?.stop()}>
                          Pause Voice Input
                        </Button>
                      </div>
                    </div>
                  )}

                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type or click the microphone to dictate your response here..."
                    disabled={submitting}
                    className="w-full h-full min-h-[220px] p-4 rounded-xl border border-line bg-surface/30 focus:outline-none focus:border-brand text-xs text-ink placeholder-faint resize-none"
                  />
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-faint hover:text-ink"
                    onClick={endSession}
                    disabled={submitting}
                  >
                    Cancel Session
                  </Button>

                  <Button
                    size="sm"
                    onClick={submitAnswer}
                    disabled={submitting || !responseText.trim()}
                  >
                    {submitting ? (
                      <>
                        <Icon.Clock className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Evaluating answer...
                      </>
                    ) : (
                      <>Submit Response</>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ---------------- STAGE 3: EVALUATION REPORT ---------------- */}
        {stage === 'evaluation' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid gap-6 md:grid-cols-12">
              
              {/* Radial Score Gauge Card */}
              <Card className="md:col-span-4 flex flex-col items-center justify-center text-center p-6 bg-surface/40 border border-line/60">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Interviewer Rating</p>
                
                {/* Radial Gauge */}
                <div className="relative flex items-center justify-center mt-6 mb-4">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="text-surface-2"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className={
                        evaluationScore >= 80 
                          ? 'text-success' 
                          : evaluationScore >= 60 
                            ? 'text-warning' 
                            : 'text-danger'
                      }
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={((100 - (evaluationScore || 0)) / 100) * (2 * Math.PI * 60)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-display font-black text-ink">{evaluationScore}</span>
                    <span className="text-[10px] text-faint uppercase font-bold font-mono">out of 100</span>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  evaluationScore >= 80 
                    ? 'bg-success/10 text-success border border-success/30' 
                    : evaluationScore >= 60 
                      ? 'bg-warning/10 text-warning border border-warning/30' 
                      : 'bg-danger/10 text-danger border border-danger/30'
                }`}>
                  {evaluationScore >= 80 ? 'Excellent Match' : evaluationScore >= 60 ? 'Passing Readiness' : 'Needs Review'}
                </span>
              </Card>

              {/* Feedback Narrative Card */}
              <Card className="md:col-span-8 p-6 bg-surface/20 border border-line">
                <div className="flex items-center gap-2 border-b border-line pb-3 mb-4">
                  <Icon.Shield size={18} className="text-brand" />
                  <h3 className="font-display font-semibold text-ink">AI Evaluation Report Narrative</h3>
                </div>
                <div className="space-y-3 prose max-w-none">
                  {renderResponseMarkdown(evaluationText)}
                </div>
              </Card>
            </div>

            {/* Navigation options */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-line bg-surface-2/20">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={endSession}
              >
                Reset & Exit Room
              </Button>

              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={nextQuestion}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Icon.Clock className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Preparing next question...
                  </>
                ) : (
                  <>Load Next Question</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
