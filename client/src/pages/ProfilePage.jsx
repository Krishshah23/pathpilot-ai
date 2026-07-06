import { useRef, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TagInput } from '@/components/ui/TagInput';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { BRANCHES, SEMESTERS, DREAM_ROLES, COMMON_SKILLS } from '@/config/careerData';

export default function ProfilePage() {
  const { user, setUser, refreshUser } = useAuth();
  const toast = useToast();

  return (
    <AppShell title="Profile" subtitle="Manage your information and settings">
      <div className="space-y-6">
        <HeaderCard user={user} setUser={setUser} />
        <div className="grid gap-6 lg:grid-cols-2">
          <PersonalInfoCard user={user} refreshUser={refreshUser} toast={toast} />
          <div className="space-y-6">
            <PublicCardSettingsCard user={user} setUser={setUser} toast={toast} />
            <SkillsCard user={user} refreshUser={refreshUser} toast={toast} />
            <ResumeCard user={user} setUser={setUser} toast={toast} />
          </div>
        </div>
        <SecurityCard toast={toast} />
      </div>
    </AppShell>
  );
}

/* ── Avatar + identity ─────────────────────────────────────────────── */
function HeaderCard({ user, setUser }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const onPick = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/profile/avatar', fd);
      setUser(data.data.user);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(errorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative">
        <Avatar user={user} size="lg" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full btn-brand text-white shadow-lg disabled:opacity-60"
          aria-label="Change photo"
        >
          <Icon.Upload size={14} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </div>
      <div className="text-center sm:text-left">
        <h2 className="font-display text-xl font-bold text-ink">{user?.name}</h2>
        <p className="text-sm text-muted">{user?.email}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
          <Badge>{user?.role === 'admin' ? 'Admin' : 'Student'}</Badge>
          {user?.isEmailVerified ? (
            <Badge tone="success">
              <Icon.Check size={12} /> Verified
            </Badge>
          ) : (
            <Badge tone="warning">Email not verified</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ── Personal information ──────────────────────────────────────────── */
function PersonalInfoCard({ user, refreshUser, toast }) {
  const p = user?.profile || {};
  const [form, setForm] = useState({
    name: user?.name || '',
    college: p.college || '',
    branch: p.branch || '',
    semester: p.semester || '',
    dreamRole: p.dreamRole || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/profile', {
        name: form.name,
        college: form.college,
        branch: form.branch,
        semester: form.semester ? Number(form.semester) : null,
        dreamRole: form.dreamRole,
      });
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errorMessage(err, 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionTitle>Personal information</SectionTitle>
      <div className="mt-4 space-y-4">
        <Input label="Full name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <Input
          label="College / University"
          value={form.college}
          onChange={(e) => set('college', e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Branch"
            placeholder="Select branch"
            options={BRANCHES}
            value={form.branch}
            onChange={(e) => set('branch', e.target.value)}
          />
          <Select
            label="Semester"
            placeholder="Select semester"
            options={SEMESTERS}
            value={form.semester}
            onChange={(e) => set('semester', e.target.value)}
          />
        </div>
        <Select
          label="Dream role"
          placeholder="Select role"
          options={DREAM_ROLES}
          value={form.dreamRole}
          onChange={(e) => set('dreamRole', e.target.value)}
        />
        <Button onClick={save} loading={saving}>
          Save changes
        </Button>
      </div>
    </Card>
  );
}

/* ── Skills ────────────────────────────────────────────────────────── */
function SkillsCard({ user, refreshUser, toast }) {
  const [skills, setSkills] = useState(user?.profile?.skills || []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/profile', { skills });
      await refreshUser();
      toast.success('Skills updated');
    } catch (err) {
      toast.error(errorMessage(err, 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionTitle>Skills</SectionTitle>
      <div className="mt-4 space-y-4">
        <TagInput value={skills} onChange={setSkills} suggestions={COMMON_SKILLS} />
        <Button onClick={save} loading={saving} variant="outline" size="sm">
          Save skills
        </Button>
      </div>
    </Card>
  );
}

/* ── Resume ────────────────────────────────────────────────────────── */
function ResumeCard({ user, setUser, toast }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const resumeUrl = user?.profile?.resumeUrl;

  const onPick = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/profile/resume', fd);
      setUser(data.data.user);
      toast.success('Resume uploaded');
    } catch (err) {
      toast.error(errorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <SectionTitle>Resume</SectionTitle>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-line bg-surface-2/40 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-brand-soft">
            <Icon.FileText size={18} />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">
              {resumeUrl ? 'Resume on file' : 'No resume yet'}
            </p>
            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-soft hover:underline"
              >
                View current
              </a>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" loading={uploading} onClick={() => fileRef.current?.click()}>
          {resumeUrl ? 'Replace' : 'Upload'}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </div>
    </Card>
  );
}

/* ── Security / password ───────────────────────────────────────────── */
function SecurityCard({ toast }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters');
    if (form.newPassword !== form.confirm) return setError('Passwords do not match');
    setError('');
    setSaving(true);
    try {
      await api.patch('/profile/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not change password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionTitle>Security</SectionTitle>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-3">
        <PasswordInput
          label="Current password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(e) => set('currentPassword', e.target.value)}
          required
        />
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(e) => set('newPassword', e.target.value)}
          required
        />
        <PasswordInput
          label="Confirm new"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(e) => set('confirm', e.target.value)}
          error={error}
          required
        />
        <div className="sm:col-span-3">
          <Button type="submit" loading={saving} variant="outline">
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ── Public Career Card settings ─────────────────────────────────────── */
function PublicCardSettingsCard({ user, setUser, toast }) {
  const [enabled, setEnabled] = useState(user?.isPublicCardEnabled || false);
  const [toggling, setToggling] = useState(false);

  const toggle = async () => {
    setToggling(true);
    try {
      const nextValue = !enabled;
      const { data } = await api.patch('/profile/public-card', { isPublicCardEnabled: nextValue });
      setEnabled(data.data.isPublicCardEnabled);
      setUser({
        ...user,
        isPublicCardEnabled: data.data.isPublicCardEnabled,
        publicCardId: data.data.publicCardId,
      });
      toast.success(`Public career card ${nextValue ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update setting'));
    } finally {
      setToggling(false);
    }
  };

  const shareUrl = `${window.location.origin}/profile/${user?.publicCardId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Shareable link copied!');
  };

  return (
    <Card>
      <SectionTitle>Public Career Card</SectionTitle>
      <p className="mt-1 text-xs text-faint">
        Generate a secure, read-only public version of your career readiness card that you can share with employers or put in your portfolio.
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line bg-surface-2/40 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-brand-soft">
            <Icon.Globe size={18} />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">
              {enabled ? 'Card is public' : 'Card is private'}
            </p>
            <p className="text-xs text-muted">
              {enabled ? 'Anyone with the link can view your metrics.' : 'Only you can view your metrics.'}
            </p>
          </div>
        </div>
        <Button size="sm" variant={enabled ? 'danger' : 'outline'} loading={toggling} onClick={toggle}>
          {enabled ? 'Make Private' : 'Make Public'}
        </Button>
      </div>

      {enabled && (
        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold text-faint block">Your Shareable Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="input !h-9 !text-xs !bg-surface-2/30 flex-1"
            />
            <Button size="sm" onClick={copyLink}>
              <Icon.Copy size={14} className="mr-1.5" /> Copy
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Small presentational helpers ──────────────────────────────────── */
function SectionTitle({ children }) {
  return <h3 className="font-display text-base font-semibold text-ink">{children}</h3>;
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-line bg-surface-2 text-muted',
    success: 'border-success/40 bg-success/10 text-success',
    warning: 'border-warning/40 bg-warning/10 text-warning',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
