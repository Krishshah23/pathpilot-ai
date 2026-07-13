import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, Field, SkillTagInput } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/icons';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const p = user?.profile || {};
  const [profileForm, setProfileForm] = useState({
    name:      user?.name      || '',
    college:   p.college       || '',
    branch:    p.branch        || '',
    semester:  p.semester      || '',
    dreamRole: p.dreamRole     || '',
    skills:    p.skills        || [],
    isPublic:  user?.isPublicCardEnabled || false,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copied, setCopied] = useState(false);

  const profileUrl = `${window.location.origin}/profile/${user?.publicCardId}`;

  // Handle Profile Save
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      // 1. General details
      await api.patch('/profile', {
        name: profileForm.name,
        college: profileForm.college,
        branch: profileForm.branch,
        semester: profileForm.semester ? Number(profileForm.semester) : null,
        dreamRole: profileForm.dreamRole,
        skills: profileForm.skills,
      });

      // 2. Public profile toggle
      await api.patch('/profile/public-card', {
        isPublicCardEnabled: profileForm.isPublic,
      });

      await refreshUser();
      toast.success('Profile details saved successfully');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save profile details'));
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.warn('Please fill in both password fields');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.warn('New password must be at least 8 characters long');
      return;
    }

    setSavingPassword(true);
    try {
      await api.patch('/profile/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update password'));
    } finally {
      setSavingPassword(false);
    }
  };

  // Trigger file selection for Avatar
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingAvatar(true);
    try {
      await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to upload profile picture'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Logged out successfully');
    navigate('/login');
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-serif font-black text-[#171717]">Profile & Settings</h1>
          <p className="text-sm text-[#A3A3A3]">Manage your academic identity, tracked skills, and public visibility credentials.</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Avatar & Account Basics */}
          <div className="md:col-span-4 space-y-6">
            <Card className="!p-6 border border-[#EAEAE5] bg-white flex flex-col items-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808003_1px,transparent_1px),linear-gradient(to_bottom,#80808003_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
              
              {/* Picture Upload Selector */}
              <div className="relative mb-4 cursor-pointer group/avatar" onClick={handleAvatarClick}>
                <div className="relative flex h-24 w-24 items-center justify-center rounded-[22px] bg-slate-900 text-3xl font-extrabold text-white border border-[#EAEAE5] overflow-hidden transition-all duration-300 group-hover/avatar:opacity-90">
                  {user?.profile?.avatarUrl ? (
                    <img src={user.profile.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    user?.name?.charAt(0).toUpperCase()
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    </div>
                  )}
                </div>
                {/* Hover Camera icon */}
                <div className="absolute inset-0 bg-black/40 rounded-[22px] flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  <Icon.Camera size={20} className="text-white" />
                </div>
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />

              <h2 className="text-lg font-bold text-[#171717]">{user?.name}</h2>
              <p className="text-xs text-[#A3A3A3] mb-1">{user?.email}</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold tracking-wider uppercase border border-slate-200">
                {user?.role}
              </span>

              <p className="text-[11px] text-[#A3A3A3] mt-4 leading-normal">
                Click on the avatar frame to upload or change your profile photo.
              </p>
            </Card>

            {/* Change Password Card */}
            <Card className="!p-6 border border-[#EAEAE5] bg-white space-y-4">
              <div className="flex items-center gap-2 border-b border-[#F5F5F3] pb-3">
                <Icon.Shield size={16} className="text-[#525252]" />
                <h3 className="font-semibold text-sm text-[#171717]">Security Settings</h3>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <Field
                  label="Current Password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(v) => setPasswordForm((f) => ({ ...f, currentPassword: v }))}
                  placeholder="••••••••"
                />
                <Field
                  label="New Password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(v) => setPasswordForm((f) => ({ ...f, newPassword: v }))}
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full h-9 rounded-xl border border-[#EAEAE5] text-xs font-semibold text-[#171717] hover:bg-[#F5F5F3] disabled:opacity-50 transition-colors"
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </Card>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full h-11 rounded-xl border border-[#EAEAE5] text-[#B85A3C] text-sm font-bold hover:bg-[#FDF5F3] hover:border-[#F5D5CB] transition-colors flex items-center justify-center gap-2 bg-white shadow-sm"
            >
              <Icon.Logout size={15} />
              Log out
            </button>
          </div>

          {/* Right Column: Profile and Career Metadata */}
          <div className="md:col-span-8 space-y-6">
            
            {/* General Info Card */}
            <Card className="!p-6 border border-[#EAEAE5] bg-white space-y-6">
              <div className="flex items-center gap-2 border-b border-[#F5F5F3] pb-3">
                <Icon.User size={16} className="text-[#525252]" />
                <h3 className="font-semibold text-sm text-[#171717]">Academic Profile Details</h3>
              </div>

              <div className="space-y-4">
                <Field
                  label="Full Name"
                  value={profileForm.name}
                  onChange={(v) => setProfileForm((f) => ({ ...f, name: v }))}
                  placeholder="e.g. Demo Student"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Target Dream Role"
                    value={profileForm.dreamRole}
                    onChange={(v) => setProfileForm((f) => ({ ...f, dreamRole: v }))}
                    placeholder="e.g. Full Stack Developer"
                  />
                  <Field
                    label="College / Institution"
                    value={profileForm.college}
                    onChange={(v) => setProfileForm((f) => ({ ...f, college: v }))}
                    placeholder="e.g. IIT Bombay"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Branch / Major"
                    value={profileForm.branch}
                    onChange={(v) => setProfileForm((f) => ({ ...f, branch: v }))}
                    placeholder="e.g. Computer Science"
                  />
                  <Field
                    label="Current Semester"
                    type="number"
                    value={profileForm.semester}
                    onChange={(v) => setProfileForm((f) => ({ ...f, semester: v }))}
                    placeholder="e.g. 6"
                  />
                </div>
              </div>
            </Card>

            {/* Tracked Skills Card */}
            <Card className="!p-6 border border-[#EAEAE5] bg-white space-y-4">
              <div className="flex items-center gap-2 border-b border-[#F5F5F3] pb-3">
                <Icon.Zap size={16} className="text-[#525252]" />
                <h3 className="font-semibold text-sm text-[#171717]">Tracked Technical Skills</h3>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-[#A3A3A3] mb-2">Tracked skills are verified during career audits to construct your path alignment score.</p>
                <SkillTagInput
                  skills={profileForm.skills}
                  onChange={(skills) => setProfileForm((f) => ({ ...f, skills }))}
                />
              </div>
            </Card>

            {/* Public Portfolio Visibility Card */}
            <Card className="!p-6 border border-[#EAEAE5] bg-white space-y-4">
              <div className="flex items-center gap-2 border-b border-[#F5F5F3] pb-3">
                <Icon.Link size={16} className="text-[#525252]" />
                <h3 className="font-semibold text-sm text-[#171717]">Public Career Card Visibility</h3>
              </div>

              <div className="rounded-xl bg-[#FBFBFA] border border-[#EAEAE5] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[#171717]">Enable Public Career Profile</h4>
                    <p className="text-xs text-[#A3A3A3] mt-0.5">Allow recruiters to discover and view your verified path alignment score card.</p>
                  </div>
                  <button
                    onClick={() => setProfileForm((f) => ({ ...f, isPublic: !f.isPublic }))}
                    className="transition-colors focus:outline-none"
                    aria-label="Toggle public profile"
                  >
                    {profileForm.isPublic ? (
                      <Icon.ToggleRight size={32} className="text-[#2B4C3F]" />
                    ) : (
                      <Icon.ToggleLeft size={32} className="text-[#D0D0CA]" />
                    )}
                  </button>
                </div>

                {profileForm.isPublic && (
                  <div className="flex items-center gap-2 rounded-lg bg-white border border-[#EAEAE5] px-3 py-2.5 text-xs">
                    <Icon.Link size={12} className="text-[#A3A3A3] shrink-0" />
                    <span className="text-[#525252] truncate flex-1 font-mono">{profileUrl}</span>
                    <button
                      onClick={handleCopyLink}
                      className="text-[#2B4C3F] font-bold hover:underline shrink-0 flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <Icon.Check size={11} className="text-emerald-500" />
                          Copied!
                        </>
                      ) : (
                        'Copy Link'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Profile Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="inline-flex items-center justify-center px-6 h-11 rounded-xl bg-[#171717] hover:bg-[#2a2a2a] text-white text-sm font-semibold shadow-sm transition duration-150 disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white mr-2" />
                    Saving changes...
                  </>
                ) : (
                  'Save Profile Details'
                )}
              </button>
            </div>

          </div>
        </div>

      </div>
    </AppShell>
  );
}
