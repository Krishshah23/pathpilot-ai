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

const STEPS = ['Goal', 'Skills'];

/**
 * Streamlined onboarding wizard.
 * Only captures the two fields that actually drive the app:
 *   1. Dream Role  — personalises Path Score, Skill Roadmap, Interview Prep
 *   2. Current Skills — seeds the gap analysis
 * Resume upload is intentionally skipped here; users do it properly
 * inside Resume Strategy where they get full AI feedback immediately.
 */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    dreamRole: user?.profile?.dreamRole || '',
    skills:    user?.profile?.skills    || [],
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const validateStep = () => {
    const e = {};
    if (step === 0 && form.dreamRole.trim().length < 2) {
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

  const finish = async () => {
    setSubmitting(true);
    try {
      await api.put('/onboarding', {
        dreamRole: form.dreamRole,
        skills:    form.skills,
      });

      await refreshUser();
      toast.success('You\'re all set! Welcome to PathPilot.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save onboarding'));
    } finally {
      setSubmitting(false);
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
          {/* ── Step 0: Dream Role ── */}
          {step === 0 && (
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
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      form.dreamRole === r
                        ? 'border-[#2B4C3F]/40 bg-[#F0F5F3] text-[#2B4C3F] font-semibold'
                        : 'border-[#EAEAE5] text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F3]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {/* ── Step 1: Skills ── */}
          {step === 1 && (
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

          {/* ── Navigation ── */}
          <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
            <Button variant="ghost" onClick={back} disabled={step === 0 || submitting}>
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Continue <Icon.ChevronRight size={16} />
              </Button>
            ) : (
              <Button onClick={finish} loading={submitting}>
                Get started
              </Button>
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
