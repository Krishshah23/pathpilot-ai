/**
 * pages/OnboardingPage.jsx — Candidate Onboarding Setup Wizard Page (/onboarding)
 *
 * ARCHITECTURAL ROLE:
 * A 4-step wizard required before accessing candidate features:
 *   - Step 0: Welcome — value-prop framing before asking for any input, so the user
 *     understands what they're about to get (Path Score, gap map, roadmap, interview coach)
 *     instead of being dropped straight into a bare form.
 *   - Step 1: Goal Selection (`dreamRole`) — Drives Path Score calculation, Skill Roadmap, and Interview Prep.
 *   - Step 2: Skill Seeding (`skills`) — Pre-populates baseline candidate skills array for gap analysis.
 *   - Step 3: First Action — instead of always dropping the user on a generic dashboard,
 *     let them pick what they want to do right now and route them straight into that flow.
 *
 * Stores payload via `PUT /api/onboarding` and marks `user.onboardingCompleted = true`.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TagInput } from '@/components/ui/TagInput';
import { Stepper } from '@/components/ui/Stepper';
import { Icon } from '@/components/ui/icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { DREAM_ROLES, COMMON_SKILLS } from '@/config/careerData';
import { cn } from '@/lib/cn';

const STEPS = ['Welcome', 'Goal', 'Skills', 'Start'];

const VALUE_PROPS = [
  { icon: <Icon.Gauge size={18} />, title: 'Path Score', desc: 'A 0–100 career readiness score computed from your resume, skills, and projects.' },
  { icon: <Icon.Target size={18} />, title: 'Skill gap map', desc: 'See exactly which skills separate you from your target role — backed by live job-market data.' },
  { icon: <Icon.Route size={18} />, title: 'Weekly roadmap', desc: 'An AI-built, week-by-week plan that closes your gaps, and remembers your progress.' },
  { icon: <Icon.Award size={18} />, title: 'AI interview coach', desc: 'Practice with questions targeting your actual gaps, scored in real time.' },
];

const FIRST_ACTIONS = [
  {
    key: 'upload',
    icon: <Icon.Upload size={22} />,
    title: 'Upload my resume',
    desc: 'Get an instant AI audit — health score, gaps, and ATS keywords in under a minute.',
    route: '/talent-analyzer',
    accent: '#10B981',
  },
  {
    key: 'build',
    icon: <Icon.FileText size={22} />,
    title: 'Build one from scratch',
    desc: "Don't have a resume yet? Start the guided builder with AI writing help.",
    route: '/resume-builder',
    accent: '#3B82F6',
  },
  {
    key: 'explore',
    icon: <Icon.Sparkles size={22} />,
    title: 'Just explore first',
    desc: 'Take a look around the dashboard before committing to anything.',
    route: '/dashboard',
    accent: '#8B5CF6',
  },
];

/**
 * Onboarding wizard. Captures the two fields that actually drive the app
 * (dream role, current skills), then routes the user directly into whichever
 * flow they say they want next instead of always landing on a bare dashboard.
 */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(null); // holds the chosen action key while saving
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    dreamRole: user?.profile?.dreamRole || '',
    skills:    user?.profile?.skills    || [],
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const validateStep = () => {
    const e = {};
    if (step === 1 && form.dreamRole.trim().length < 2) {
      e.dreamRole = 'Pick a target role to continue';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async (action) => {
    setSubmitting(action.key);
    try {
      await api.put('/onboarding', {
        dreamRole: form.dreamRole,
        skills:    form.skills,
      });

      await refreshUser();
      toast.success('You\'re all set! Welcome to PathPilot.');
      navigate(action.route, { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save onboarding'));
      setSubmitting(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>

      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <Stepper steps={STEPS} current={step} />
        </div>

        <Card className="animate-fade-up">
          {/* ── Step 0: Welcome / value prop ── */}
          {step === 0 && (
            <StepShell
              title="Welcome to PathPilot 👋"
              desc="Here's what we'll build for you in the next couple of minutes."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {VALUE_PROPS.map((v, i) => (
                  <div
                    key={v.title}
                    className={cn('rounded-xl border border-line bg-surface-2/60 p-4 animate-fade-up', `stagger-${i + 1}`)}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand border border-brand/20 mb-2.5">
                      {v.icon}
                    </span>
                    <p className="text-sm font-bold text-ink">{v.title}</p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">{v.desc}</p>
                  </div>
                ))}
              </div>
            </StepShell>
          )}

          {/* ── Step 1: Dream Role ── */}
          {step === 1 && (
            <StepShell
              title="What's your target role?"
              desc="We'll personalise your Path Score, Skill Roadmap, and Interview Prep around this. You can change it anytime."
            >
              <Select
                label="Target role"
                placeholder="Select a role"
                options={DREAM_ROLES}
                value={form.dreamRole}
                onChange={(e) => set('dreamRole', e.target.value)}
                error={errors.dreamRole}
              />
              {/* Quick-pick chips */}
              <div className="flex flex-wrap gap-2">
                {DREAM_ROLES.slice(0, 8).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set('dreamRole', r)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs transition',
                      form.dreamRole === r
                        ? 'border-brand/40 bg-brand/10 text-brand font-semibold'
                        : 'border-line text-muted hover:text-ink hover:bg-surface-2'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {/* ── Step 2: Skills ── */}
          {step === 2 && (
            <StepShell
              title="What skills do you already have?"
              desc="Add what you're comfortable with. This seeds your skill gap analysis — you can refine anytime."
            >
              <TagInput
                label="Current skills"
                value={form.skills}
                onChange={(v) => set('skills', v)}
                suggestions={COMMON_SKILLS}
              />
              <p className="text-xs text-faint">
                Don't worry about being exhaustive — the AI will also extract skills from your resume when you upload it later.
              </p>
            </StepShell>
          )}

          {/* ── Step 3: First action ── */}
          {step === 3 && (
            <StepShell
              title="What do you want to do first?"
              desc="Pick one — you can always reach the others from the nav bar."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {FIRST_ACTIONS.map((a) => {
                  const isPending = submitting === a.key;
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => finish(a)}
                      disabled={!!submitting}
                      aria-label={`${a.title} — ${a.desc}`}
                      className="text-left rounded-xl border border-line bg-surface p-4 hover:border-brand/40 hover:bg-surface-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white mb-3"
                        style={{ background: a.accent }}
                      >
                        {isPending ? <Icon.RotateCw size={16} className="animate-spin" /> : a.icon}
                      </span>
                      <p className="text-sm font-bold text-ink">{a.title}</p>
                      <p className="text-xs text-muted mt-1 leading-relaxed">{a.desc}</p>
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {/* ── Navigation ── */}
          <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
            <Button variant="ghost" onClick={back} disabled={step === 0 || !!submitting}>
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Continue <Icon.ChevronRight size={16} />
              </Button>
            ) : (
              <p className="text-xs text-faint">Choose an option above to continue</p>
            )}
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-faint">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}

function StepShell({ title, desc, children }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{desc}</p>
      </div>
      {children}
    </div>
  );
}
