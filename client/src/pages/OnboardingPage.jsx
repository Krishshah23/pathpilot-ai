import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TagInput } from '@/components/ui/TagInput';
import { FileUpload } from '@/components/ui/FileUpload';
import { Stepper } from '@/components/ui/Stepper';
import { Icon } from '@/components/ui/icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { BRANCHES, SEMESTERS, DREAM_ROLES, COMMON_SKILLS } from '@/config/careerData';

const STEPS = ['Education', 'Goal', 'Skills', 'Resume'];

/**
 * Multi-step onboarding wizard. Captures education, dream role, current skills,
 * and an optional resume, then submits to the backend and unlocks the app.
 */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    college: user?.profile?.college || '',
    branch: user?.profile?.branch || '',
    semester: user?.profile?.semester || '',
    dreamRole: user?.profile?.dreamRole || '',
    skills: user?.profile?.skills || [],
  });
  const [resumeFile, setResumeFile] = useState(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (form.college.trim().length < 2) e.college = 'Enter your college';
      if (!form.branch) e.branch = 'Select your branch';
      if (!form.semester) e.semester = 'Select your semester';
    }
    if (step === 1 && form.dreamRole.trim().length < 2) e.dreamRole = 'Choose a target role';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      await api.put('/onboarding', {
        college: form.college,
        branch: form.branch,
        semester: Number(form.semester),
        dreamRole: form.dreamRole,
        skills: form.skills,
      });

      if (resumeFile) {
        const fd = new FormData();
        fd.append('file', resumeFile);
        await api.post('/profile/resume', fd);
      }

      await refreshUser();
      toast.success('You’re all set! Welcome to PathPilot.');
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
          {step === 0 && (
            <StepShell
              title="Tell us about your education"
              desc="This helps us tailor recommendations to where you are."
            >
              <Input
                label="College / University"
                placeholder="e.g. Indian Institute of Technology"
                value={form.college}
                onChange={(e) => set('college', e.target.value)}
                error={errors.college}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Branch"
                  placeholder="Select branch"
                  options={BRANCHES}
                  value={form.branch}
                  onChange={(e) => set('branch', e.target.value)}
                  error={errors.branch}
                />
                <Select
                  label="Semester"
                  placeholder="Select semester"
                  options={SEMESTERS}
                  value={form.semester}
                  onChange={(e) => set('semester', e.target.value)}
                  error={errors.semester}
                />
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              title="What's your dream role?"
              desc="We'll map your path toward this target. You can change it anytime."
            >
              <Select
                label="Target role"
                placeholder="Select a role"
                options={DREAM_ROLES}
                value={form.dreamRole}
                onChange={(e) => set('dreamRole', e.target.value)}
                error={errors.dreamRole}
              />
              <div className="flex flex-wrap gap-2">
                {DREAM_ROLES.slice(0, 6).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set('dreamRole', r)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      form.dreamRole === r
                        ? 'border-brand/60 bg-brand/15 text-brand-soft'
                        : 'border-line text-muted hover:text-ink'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              title="What skills do you have?"
              desc="Add the skills you're comfortable with. Don't worry — you can refine these later."
            >
              <TagInput
                label="Current skills"
                value={form.skills}
                onChange={(v) => set('skills', v)}
                suggestions={COMMON_SKILLS}
              />
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              title="Upload your resume"
              desc="Optional — but it powers Resume Intelligence and a more accurate Path Score."
            >
              <FileUpload
                file={resumeFile}
                onSelect={setResumeFile}
                existingLabel={
                  user?.profile?.resumeUrl && !resumeFile ? 'A resume is already on file' : undefined
                }
              />
              <p className="text-xs text-faint">
                You can skip this and add it later from your profile.
              </p>
            </StepShell>
          )}

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
                {resumeFile ? 'Finish & upload' : 'Finish'}
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
