import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/icons';
import { api, errorMessage } from '@/lib/api';

export default function PublicProfilePage() {
  const { publicCardId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPublicProfile() {
      try {
        const { data } = await api.get(`/profile/public/${publicCardId}`);
        setProfile(data.data);
      } catch (err) {
        setError(errorMessage(err, 'This public career profile could not be found or is set to private.'));
      } finally {
        setLoading(false);
      }
    }
    loadPublicProfile();
  }, [publicCardId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-800 border-t-sky-500" />
        <p className="mt-4 text-xs text-slate-400 font-medium">Retrieving verified career profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white text-center">
        <div className="max-w-md space-y-6 rounded-3xl border border-rose-500/20 bg-rose-950/10 p-8 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <Icon.AlertTriangle size={28} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Profile Unavailable</h1>
            <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white border border-slate-800 hover:bg-slate-800 transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Calculate the score color and circumference
  const score = profile.pathScore || 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let gaugeColor = '#ef4444'; // Red
  if (score >= 75) gaugeColor = '#10b981'; // Green
  else if (score >= 50) gaugeColor = '#f59e0b'; // Orange

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 text-white overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-sky-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-brand/10 blur-[120px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-lg scale-in">
        <Card className="!p-8 border border-white/10 bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-sky-500/5 flex flex-col items-center">
          
          {/* Top Brand Watermark */}
          <div className="flex items-center gap-1.5 opacity-60 mb-6">
            <Icon.Target size={16} className="text-sky-400" />
            <span className="text-xs font-bold tracking-wider uppercase text-slate-300">Verified Career Profile</span>
          </div>

          {/* User Avatar */}
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-2xl font-bold text-white shadow-lg shadow-sky-500/25">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover rounded-2xl" />
              ) : (
                profile.name.charAt(0).toUpperCase()
              )}
            </div>
            <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 border border-white/10 text-emerald-400 text-xs shadow-md" title="Verified Member">
              <Icon.Check size={14} />
            </span>
          </div>

          {/* Name & College details */}
          <div className="text-center mt-4 space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">{profile.name}</h2>
            <p className="text-sm font-semibold text-sky-400">{profile.dreamRole || 'Software Explorer'}</p>
            <p className="text-xs text-slate-400 max-w-sm">
              {profile.college}{profile.branch && ` • ${profile.branch}`}{profile.semester && ` • Sem ${profile.semester}`}
            </p>
          </div>

          {/* Path Score Ring Section */}
          <div className="mt-8 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  className="stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Foreground Score Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke={gaugeColor}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black font-display tracking-tight text-white">{score}</span>
                <span className="text-xs font-semibold text-slate-400 block -mt-1">Path Score</span>
              </div>
            </div>

            {/* Readiness Indicator */}
            <div className="mt-4 text-center space-y-1 bg-white/5 border border-white/5 rounded-2xl px-5 py-3 max-w-sm">
              <span className="text-xs font-bold text-emerald-400 block tracking-wide uppercase">
                {profile.readinessLabel}
              </span>
              <p className="text-[11px] text-slate-400 leading-normal">
                {profile.readinessSummary || 'Student is actively growing their skills profile.'}
              </p>
            </div>
          </div>

          {/* Verified Skills Section */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="w-full mt-8 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider text-center">Verified Competencies</h3>
              <div className="flex flex-wrap justify-center gap-1.5">
                {profile.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-800/80 border border-white/5 px-3 py-1.5 text-xs text-slate-300 font-medium hover:border-slate-700 transition"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer watermark */}
          <div className="w-full mt-8 border-t border-white/5 pt-6 text-center">
            <p className="text-[10px] text-slate-500">
              Verified by PathPilot AI Career Analytics Platform
            </p>
            <Link
              to="/register"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-sky-400 font-bold hover:underline"
            >
              Build your own career card <Icon.ArrowRight size={12} />
            </Link>
          </div>

        </Card>
      </div>
    </div>
  );
}
