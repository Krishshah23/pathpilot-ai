import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
        const name = data.data.name;
        const role = data.data.dreamRole;
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080B12]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-500" />
          </div>
          <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">Loading career profile</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#080B12] p-6">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Icon.AlertTriangle size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Profile Unavailable</h1>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">{error}</p>
          </div>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition">
            Go to Login <Icon.ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const name = profile.name || 'Unknown';
  const dreamRole = profile.dreamRole || 'Software Engineer';
  const college = profile.college || '';
  const branch = profile.branch || '';
  const semester = profile.semester || '';
  const avatarUrl = profile.avatarUrl || null;
  const score = profile.pathScore || 0;
  const factors = profile.factors || [];
  const skills = profile.skills || [];
  const joinYear = new Date().getFullYear();  // Score ring math
  const r = 52;
  const circ = 2 * Math.PI * r;
  // Matte dynamic colors: Forest Green (ready), Amber-Brown (on track), Terracotta-Rust (building)
  const scoreColor = score >= 75 ? '#2B4C3F' : score >= 50 ? '#92400E' : '#B85A3C';

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#171717] font-sans relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        .font-serif { font-family: 'Merriweather', Georgia, serif; }
        * { font-family: 'Inter', sans-serif; }
        h1, h2, h3, .font-serif-header { font-family: 'Merriweather', Georgia, serif; }
        
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes drawRing { from { stroke-dashoffset: ${circ}; } to { stroke-dashoffset: ${circ - (score / 100) * circ}; } }
        
        .fade-up { animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fade-up-2 { animation: fadeUp 0.4s 0.05s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fade-up-3 { animation: fadeUp 0.4s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fade-up-4 { animation: fadeUp 0.4s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .ring-draw { animation: drawRing 1s 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; stroke-dashoffset: ${circ}; }
        
        .matte-card {
          background-color: #FFFFFF;
          border: 1px solid #EAEAE5;
          border-radius: 1rem;
        }
        .matte-card-hover:hover {
          background-color: #F5F5F3;
          border-color: #D0D0CA;
        }
      `}</style>

      {/* ── Ambient Background: Elegant Subtle Graph Paper Grid ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(234,234,229,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(234,234,229,0.4) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 sm:px-8 sm:py-16">

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between mb-10 fade-up">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2B4C3F]/10 border border-[#2B4C3F]/20">
              <span className="text-[10px] font-black text-[#2B4C3F]">PP</span>
            </div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#525252]">PathPilot AI</span>
          </div>
          <button
            onClick={handleCopyLink}
            className="matte-card px-4 py-2 text-xs font-semibold text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F3] hover:border-[#D0D0CA] transition-all duration-200"
          >
            {copied ? (
              <span className="flex items-center gap-1.5"><Icon.Check size={13} className="text-[#2B4C3F]" /> Copied!</span>
            ) : (
              <span className="flex items-center gap-1.5"><Icon.Copy size={13} /> Share Profile</span>
            )}
          </button>
        </div>

        {/* ── Hero Section ── */}
        <div className="relative rounded-2xl p-8 sm:p-10 mb-6 fade-up-2 border border-[#EAEAE5] bg-white overflow-hidden">
          {/* Subtle background detail inside hero */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 80% 50%, #2B4C3F 0%, transparent 60%)',
          }} />

          <div className="relative flex flex-col sm:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="relative h-28 w-28 rounded-2xl overflow-hidden border border-[#EAEAE5] bg-[#F5F5F3] flex items-center justify-center text-4xl font-serif font-black text-[#171717]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <span style={{ color: '#2B4C3F' }}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Verified badge */}
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white shadow-md text-white" style={{ background: scoreColor }}>
                <Icon.Check size={11} strokeWidth={3} />
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mb-2">
                <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#2B4C3F]/10 text-[#2B4C3F] border border-[#2B4C3F]/20">
                  ✦ Verified Profile
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#A3A3A3]">Member since {joinYear}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-[#171717] mb-2">{name}</h1>
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold mb-4 bg-[#F5F5F3] border border-[#EAEAE5] text-[#525252]">
                <Icon.Target size={13} className="text-[#2B4C3F]" />
                {dreamRole}
              </div>
              {college && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center sm:justify-start text-sm">
                  <span className="flex items-center gap-1.5 text-[#525252]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2B4C3F]" />
                    {college}
                  </span>
                  {branch && (
                    <span className="flex items-center gap-1.5 text-[#A3A3A3]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#EAEAE5]" />
                      {branch}{semester && ` · Sem ${semester}`}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Quick score badge on hero */}
            <div className="flex-shrink-0 text-center p-5 rounded-2xl bg-[#F5F5F3] border border-[#EAEAE5]">
              <div className="text-4xl font-serif font-black" style={{ color: scoreColor }}>{score}</div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-[#525252] mt-1">Path Score</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: scoreColor }}>
                {score >= 75 ? 'Interview-Ready' : score >= 50 ? 'On Track' : 'Building'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 fade-up-3">

          {/* ── Left: Score Gauge + Factors ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Ring gauge card */}
            <div className="matte-card p-7">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-[#A3A3A3] mb-6">Career Readiness</h3>
              <div className="flex flex-col items-center gap-5">
                <div className="relative">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    {/* Track */}
                    <circle cx="80" cy="80" r={r} fill="none" stroke="#F5F5F3" strokeWidth="10" />
                    {/* Score arc */}
                    <circle
                      cx="80" cy="80" r={r}
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      className="ring-draw"
                      transform="rotate(-90 80 80)"
                    />
                    {/* Center text */}
                    <text x="80" y="72" textAnchor="middle" fill="#171717" fontSize="28" fontWeight="900" className="font-serif-header">{score}</text>
                    <text x="80" y="90" textAnchor="middle" fill="#525252" fontSize="9" fontWeight="700" letterSpacing="2">PATH SCORE</text>
                  </svg>
                </div>

                <div className="w-full p-4 rounded-2xl text-center" style={{ background: `${scoreColor}0A`, borderColor: `${scoreColor}20`, borderStyle: 'solid', borderWidth: '1px' }}>
                  <p className="text-xs font-bold" style={{ color: scoreColor }}>
                    {score >= 75 ? 'Interview-Ready Foundation' : score >= 50 ? 'On Track — Keep Building' : 'Early-Stage Candidate'}
                  </p>
                  <p className="mt-1 text-[11px] text-[#525252] leading-relaxed">
                    {profile.readinessSummary || 'Actively building portfolio signals and technical expertise to match hireability standards.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Factor breakdown */}
            {factors.length > 0 && (
              <div className="matte-card p-6">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-[#A3A3A3] mb-5">Metrics Breakdown</h3>
                <div className="space-y-4">
                  {factors.map((f) => {
                    const pct = Math.round((f.score / f.max) * 100) || 0;
                    const color = f.status === 'good' ? '#2B4C3F' : pct >= 50 ? '#92400E' : '#B85A3C';
                    return (
                      <div key={f.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-[#525252]">{f.label}</span>
                          <span className="text-xs font-bold font-mono" style={{ color }}>{f.score}/{f.max}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#F5F5F3] border border-[#EAEAE5] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Skills + CTA ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Skills grid */}
            {skills.length > 0 && (
              <div className="matte-card p-7">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-bold tracking-widest uppercase text-[#A3A3A3]">Technical Skills</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2B4C3F]/10 text-[#2B4C3F] border border-[#2B4C3F]/20">
                    {skills.length} verified
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#525252] bg-[#F5F5F3] border border-[#EAEAE5] matte-card-hover transition-all duration-200"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2B4C3F] flex-shrink-0" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats summary row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Skills', value: skills.length, icon: '⚡' },
                { label: 'Path Score', value: `${score}/100`, icon: '🎯' },
                { label: 'Status', value: score >= 75 ? 'Ready' : 'Building', icon: '🚀' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="matte-card p-4 text-center">
                  <div className="text-xl mb-1">{icon}</div>
                  <div className="text-lg font-serif font-black text-[#171717]">{value}</div>
                  <div className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>

            {/* CTA Card */}
            <div className="rounded-2xl p-7 relative overflow-hidden bg-[#2B4C3F] text-white border border-[#2B4C3F]/20 shadow-sm">
              <div className="absolute right-0 top-0 h-full w-1/2 pointer-events-none opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 70%)'
              }} />
              <div className="relative">
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#F5F5F3] opacity-80 mb-2">Want your own profile?</p>
                <h3 className="text-xl font-serif font-black text-white mb-2">Build your career on PathPilot</h3>
                <p className="text-sm text-[#F5F5F3]/80 mb-5 leading-relaxed">
                  Get AI-powered resume audits, skill gap analysis, and a shareable verified profile card.
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold bg-white text-[#2B4C3F] transition-all duration-200 hover:bg-[#F5F5F3] hover:scale-[1.02] shadow-sm"
                >
                  Get Started Free <Icon.ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-12 pt-8 border-t border-[#EAEAE5] text-center fade-up-4">
          <p className="text-[11px] text-[#A3A3A3] tracking-widest uppercase">
            Powered by PathPilot AI · Career Intelligence Platform
          </p>
        </div>

      </div>
    </div>
  );
}
