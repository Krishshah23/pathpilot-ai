import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { FAQSection } from '@/components/FAQSection';
import AgentConstellation from '@/components/agents/AgentConstellation';

const TABS = [
  { key: 'login', label: 'Log In', to: '/login' },
  { key: 'register', label: 'Create Account', to: '/register' },
];

export function AuthLayout({ title, subtitle, children, activeTab }) {
  return (
    <div className="flight-deck-bg min-h-screen flex flex-col">
      {/* Top instrument strip */}
      <div className="h-8 shrink-0 border-b border-[#1E2530] flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="hud-pulse-dot h-1.5 w-1.5 rounded-full bg-[#34D399]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#8B95A1]">Systems Nominal</span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#8B95A1]">PathPilot Core · v1.0</span>
      </div>

      <div className="flex-1 grid lg:grid-cols-2">
        {/* Left panel — radar nav display */}
        <div
          className="panel-fade-in relative z-10 hidden overflow-y-auto lg:flex lg:flex-col lg:justify-between lg:p-12"
          style={{ animationDelay: '0ms' }}
        >
          <div className="relative z-10">
            <a href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/10">
                <span className="text-white font-bold text-sm font-sans tracking-tight">PP</span>
              </span>
              <span className="font-serif font-bold text-white text-lg tracking-tight">
                PathPilot
              </span>
            </a>
          </div>

          <div className="relative z-10 max-w-md mx-auto">
            <h1 className="font-display text-4xl font-extrabold leading-tight text-white">
              Navigate your career.{' '}
              <span className="text-[#34D399]">Powered by intelligence.</span>
            </h1>
            <p className="mt-4 text-white/60 leading-relaxed">
              PathPilot is your personal career operating system — understand where you stand and
              build a clear path to job-ready.
            </p>

            <div className="mt-10">
              <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#34D399] mb-5">
                Powered by Multi-Agent Intelligence Core
              </p>
              <AgentConstellation size={280} />
            </div>
          </div>

          {/* FAQ — its own padded section so it doesn't crowd the radar */}
          <div className="relative z-10 max-w-md mx-auto w-full py-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#34D399] mb-4">Frequently Asked</p>
            <FAQSection limit={2} dark />
            <a href="/faq" className="hud-focus mt-4 inline-block font-mono text-xs font-semibold text-[#34D399] hover:underline rounded">
              View all FAQs →
            </a>
          </div>

          <p className="relative z-10 text-xs text-white/30 shrink-0 pt-6">© {new Date().getFullYear()} PathPilot AI</p>
        </div>

        {/* Right panel — HUD instrument panel */}
        <div
          className="panel-fade-in relative z-10 flex items-center justify-center p-6 sm:p-10"
          style={{ animationDelay: '150ms' }}
        >
          <div className="hud-card relative w-full max-w-md bg-[#11151C] border border-[#1E2530] rounded-lg p-8 sm:p-10">
            {/* HUD bracket corners */}
            <span className="hud-corner top-0 left-0 border-t-2 border-l-2 rounded-tl-md" />
            <span className="hud-corner top-0 right-0 border-t-2 border-r-2 rounded-tr-md" />
            <span className="hud-corner bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md" />
            <span className="hud-corner bottom-0 right-0 border-b-2 border-r-2 rounded-br-md" />

            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/10">
                <span className="text-white font-bold text-sm font-sans tracking-tight">PP</span>
              </span>
              <span className="font-serif font-bold text-white text-lg tracking-tight">PathPilot</span>
            </div>

            {/* Tab toggle — mint underline on the active tab */}
            {activeTab && (
              <div className="mb-7 flex items-center gap-6">
                {TABS.map((tab) => (
                  <Link
                    key={tab.key}
                    to={tab.to}
                    className={cn(
                      'hud-focus pb-2.5 font-mono text-xs uppercase tracking-wide border-b-2 transition-colors rounded-t',
                      activeTab === tab.key ? 'text-white border-[#34D399]' : 'text-[#7C8695] border-transparent hover:text-white'
                    )}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            )}

            <h2 className="font-serif text-2xl font-bold text-white">{title}</h2>
            {subtitle && <p className="mt-1.5 text-sm text-[#8B95A1]">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
