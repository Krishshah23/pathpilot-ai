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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadPublicProfile() {
      try {
        const { data } = await api.get(`/profile/public/${publicCardId}`);
        setProfile(data.data);
        // Dynamically update document title and OG meta tags for rich link previews
        const name = data.data.user?.name;
        const role = data.data.user?.profile?.dreamRole;
        const title = role
          ? `${name} — ${role} | PathPilot AI`
          : `${name}'s Career Profile | PathPilot AI`;
        const desc = `View ${name}'s verified career profile, skills, and path score on PathPilot AI.`;
        document.title = title;
        document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
        document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
        document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
        document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', desc);
        document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
      } catch (err) {
        setError(errorMessage(err, 'This public career profile could not be found or is set to private.'));
      } finally {
        setLoading(false);
      }
    }
    loadPublicProfile();
  }, [publicCardId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const score = profile.pathScore || 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let gaugeColor = '#ef4444'; // Red
  if (score >= 75) gaugeColor = '#10b981'; // Green
  else if (score >= 50) gaugeColor = '#f59e0b'; // Orange

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#090D16] p-4 sm:p-8 text-white overflow-hidden font-sans">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

      {/* Outer Container with Max Width */}
      <div className="relative w-full max-w-4xl scale-in z-10">
        
        {/* Top Floating Badge */}
        <div className="flex justify-between items-center mb-6 px-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">PathPilot Verified Profile</span>
          </div>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900/60 border border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            {copied ? (
              <>
                <Icon.Check size={13} className="text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Icon.Copy size={13} />
                Share Profile
              </>
            )}
          </button>
        </div>

        {/* main interactive grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Personal Profile Hero Card */}
          <div className="md:col-span-5 flex flex-col">
            <Card className="flex-1 !p-8 border border-white/10 bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-2xl flex flex-col items-center justify-between text-center relative overflow-hidden group">
              {/* Subtle grid pattern overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
              
              <div className="w-full flex flex-col items-center relative z-10">
                {/* User Avatar Frame with dynamic border glow */}
                <div className="relative mb-6">
                  <div className="absolute -inset-1 rounded-[24px] bg-gradient-to-tr from-sky-500 to-indigo-600 opacity-60 blur-md group-hover:opacity-100 transition duration-500" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[22px] bg-slate-950 text-3xl font-extrabold text-white border border-white/10 overflow-hidden shadow-inner">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                    ) : (
                      profile.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#10b981] border-4 border-slate-900 text-white text-xs shadow-lg" title="Verified Professional Profile">
                    <Icon.Check size={14} strokeWidth={3} />
                  </span>
                </div>

                {/* Profile Meta info */}
                <div className="space-y-2 w-full">
                  <h2 className="text-2xl font-black tracking-tight text-white">{profile.name}</h2>
                  
                  {/* Dream Role Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
                    <Icon.Target size={12} />
                    {profile.dreamRole || 'Software Explorer'}
                  </div>

                  {/* College Credentials */}
                  <p className="text-sm text-slate-300 font-medium px-4 mt-2">
                    {profile.college}
                  </p>
                  {profile.branch && (
                    <p className="text-xs text-slate-400">
                      {profile.branch} {profile.semester && ` • Semester ${profile.semester}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Verified member footer note */}
              <div className="w-full mt-8 pt-6 border-t border-white/5 text-xs text-slate-500 relative z-10">
                Verified Member since {new Date().getFullYear()}
              </div>
            </Card>
          </div>

          {/* Right Column: Path Score Analytics & Breakdown */}
          <div className="md:col-span-7 flex flex-col gap-6">
            
            {/* Core Score & Readiness Card */}
            <Card className="!p-6 border border-white/10 bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-xl">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                
                {/* Visual Ring Gauge */}
                <div className="relative flex items-center justify-center flex-shrink-0">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r={radius - 8}
                      className="stroke-slate-800/80"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r={radius - 8}
                      stroke={gaugeColor}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * (radius - 8)}
                      strokeDashoffset={2 * Math.PI * (radius - 8) - (score / 100) * 2 * Math.PI * (radius - 8)}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-3xl font-black tracking-tight text-white">{score}</span>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Path Score</span>
                  </div>
                </div>

                {/* Readiness summary */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                    {profile.readinessLabel} Status
                  </div>
                  <h3 className="text-lg font-bold text-white">Career Alignment Report</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {profile.readinessSummary || 'This candidate is actively aligning their project portfolio, core technical expertise, and profile signals to match real-world hireability standards.'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Score Factor Breakdown */}
            {profile.factors && profile.factors.length > 0 && (
              <Card className="!p-6 border border-white/10 bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Readiness Metrics Breakdown</h3>
                
                <div className="space-y-3.5">
                  {profile.factors.map((factor) => {
                    const pct = Math.round((factor.score / factor.max) * 100) || 0;
                    let barColor = 'bg-rose-500';
                    let textClass = 'text-rose-400';
                    if (factor.status === 'good') {
                      barColor = 'bg-emerald-500';
                      textClass = 'text-emerald-400';
                    } else if (factor.status === 'warning' || pct >= 50) {
                      barColor = 'bg-amber-500';
                      textClass = 'text-amber-400';
                    }

                    return (
                      <div key={factor.key} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-300">{factor.label}</span>
                          <span className={`font-mono font-bold ${textClass}`}>
                            {factor.score}/{factor.max} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all duration-1000`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Skills / verified Competencies Card */}
            {profile.skills && profile.skills.length > 0 && (
              <Card className="!p-6 border border-white/10 bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified Technical Competencies</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950/80 border border-white/5 hover:border-white/10 px-3.5 py-2 text-xs text-slate-200 font-medium transition duration-300"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      {skill}
                    </span>
                  ))}
                </div>
              </Card>
            )}

          </div>
        </div>

        {/* Verified platform footer */}
        <div className="w-full mt-10 text-center space-y-3">
          <p className="text-[10px] text-slate-600 tracking-wide uppercase">
            Powered by PathPilot AI Career Analytics & Portfolio Intelligence Platform
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-bold hover:text-sky-300 transition duration-200"
          >
            Create your verified profile <Icon.ArrowRight size={13} />
          </Link>
        </div>

      </div>
    </div>
  );
}
