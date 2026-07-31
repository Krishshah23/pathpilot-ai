/**
 * components/layout/AuthLayout.jsx — Cinematic Landing + Login/Register (Phase 3)
 *
 * The app's front door. Deliberately dark, premium, and visually distinct
 * from the light minimal product it leads into — the same contrast Linear/
 * Vercel/Raycast draw between their marketing site and their actual product
 * UI. See index.css's "Auth Landing" block for the gradient mesh, grain, and
 * grid-texture CSS this page is built on.
 *
 * Structure: hero (word-staggered headline + the login/register form, both
 * above the fold so the primary CTA is never buried) → Path Score spotlight
 * (a real, scroll-triggered ScoreGauge mockup) → an asymmetric feature grid
 * (each card gets its own small purpose-built visual, not a repeated
 * icon-in-circle) → FAQ → footer.
 */

import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { cn } from '@/lib/cn';
import { FAQSection } from '@/components/FAQSection';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { Icon } from '@/components/ui/icons';
import {
  AtsRingVisual,
  KeywordGapVisual,
  RoadmapDotsVisual,
  LiveJobsVisual,
  InterviewWaveVisual,
} from '@/components/auth/FeatureVisuals';

const TABS = [
  { key: 'login', label: 'Log In', to: '/login' },
  { key: 'register', label: 'Create Account', to: '/register' },
];

const STATS = [
  { label: '0–100 Path Score' },
  { label: 'AI gap analysis' },
  { label: 'Real-time job matches' },
];

const DEMO_FACTORS = [
  { label: 'Resume Quality', score: 35, max: 35 },
  { label: 'Skills', score: 25, max: 25 },
  { label: 'Projects', score: 18, max: 20 },
  { label: 'Profile Completion', score: 20, max: 20 },
];

/** Word-by-word stagger reveal, skipped entirely under prefers-reduced-motion. */
function StaggerLine({ text, className, delayStart = 0 }) {
  const reduce = useReducedMotion();
  const words = text.split(' ');

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.045, delayChildren: reduce ? 0 : delayStart } },
  };
  const word = {
    hidden: { opacity: 0, y: reduce ? 0 : 16, filter: reduce ? 'none' : 'blur(4px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: reduce ? 0.01 : 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <motion.span initial="hidden" animate="visible" variants={container} className={className}>
      {words.map((w, i) => (
        <motion.span key={i} variants={word} className="inline-block">
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </motion.span>
  );
}

/** Fades a section up into view once, skipping the motion entirely under prefers-reduced-motion. */
function Reveal({ children, className, delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: reduce ? 0.15 : 0.6, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** The gauge's own fill animation is mount-triggered, so gate its mount on scroll-into-view. */
function PathScoreMockup() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <div
      ref={ref}
      className="relative w-full max-w-sm rounded-[28px] border border-white/10 p-8 flex flex-col items-center text-center overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)',
        boxShadow: '0 0 0 1px rgba(52,211,153,0.1), 0 24px 56px -16px rgba(0,0,0,0.65)',
      }}
    >
      <div className="relative z-10 flex flex-col items-center">
        {inView ? (
          <ScoreGauge score={87} label="Strong" dark size={200} />
        ) : (
          <div style={{ width: 200, height: 200 }} />
        )}
        <div className="mt-6 w-full space-y-2.5">
          {DEMO_FACTORS.map((f) => (
            <div key={f.label}>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-white/70">{f.label}</span>
                <span className="text-white/40 font-mono">{f.score}/{f.max}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#34D399]"
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${Math.round((f.score / f.max) * 100)}%` } : { width: 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Feature grid card — variable size, each with its own small real visual (never a generic icon-in-circle). */
function FeatureCard({ eyebrow, title, desc, visual, span, delay }) {
  return (
    <Reveal delay={delay} className={span}>
      <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col hover:border-[#34D399]/25 hover:bg-white/[0.045] transition-colors">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{eyebrow}</p>
        <h3 className="mt-1.5 text-base font-bold text-white">{title}</h3>
        <p className="mt-1.5 text-[13px] text-white/55 leading-relaxed max-w-md">{desc}</p>
        <div className="mt-5 pt-4 border-t border-white/[0.06]">{visual}</div>
      </div>
    </Reveal>
  );
}

export function AuthLayout({ title, subtitle, children, activeTab }) {
  const reduce = useReducedMotion();

  return (
    <div className="flight-deck-bg min-h-screen">
      <div className="auth-grain" />

      {/* Top instrument strip */}
      <div className="relative z-10 h-10 shrink-0 border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="hud-pulse-dot h-1.5 w-1.5 rounded-full bg-[#34D399]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#8B95A1]">Systems Nominal</span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#8B95A1]">PathPilot Core · v1.0</span>
      </div>

      {/* ── Hero: headline + form, both above the fold ─────────────────── */}
      <section className="relative overflow-hidden">
        <div className="auth-mesh">
          <span className="auth-mesh-blob auth-mesh-blob-emerald" />
          <span className="auth-mesh-blob auth-mesh-blob-indigo" />
          <span className="auth-mesh-blob auth-mesh-blob-cyan" />
        </div>
        <div className="auth-grid-overlay" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 lg:py-16 grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: brand + pitch */}
          <div>
            <a href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/10">
                <span className="text-white font-bold text-sm font-sans tracking-tight">PP</span>
              </span>
              <span className="font-serif font-bold text-white text-lg tracking-tight">PathPilot</span>
            </a>

            <p className="mt-8 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#34D399]">
              AI Career Operating System
            </p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl font-extrabold leading-[1.08] text-white">
              <StaggerLine text="Know exactly how ready you are." />
              <br />
              <StaggerLine text="And exactly what closes the gap." className="text-[#34D399]" delayStart={0.32} />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : 0.6 }}
              className="mt-5 max-w-lg text-white/60 leading-relaxed"
            >
              PathPilot turns your resume, skills, and goals into one Path Score — then builds the
              roadmap, finds the jobs, and coaches your interviews to get you there.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : 0.72 }}
              className="mt-7 flex flex-wrap gap-2.5"
            >
              {STATS.map((s) => (
                <span
                  key={s.label}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white/70"
                >
                  {s.label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: the auth form itself */}
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.6, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.2 }}
            className="lg:justify-self-end w-full"
          >
            <div
              className="hud-card relative w-full max-w-md ml-auto rounded-[28px] border border-white/10 p-8 sm:p-10"
              style={{
                background: 'rgba(22, 24, 28, 0.72)',
                backdropFilter: 'blur(28px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
                boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.55)',
              }}
            >
              {/* Tab toggle */}
              {activeTab && (
                <div className="apple-segmented mb-7 inline-flex" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {TABS.map((tab) => (
                    <Link
                      key={tab.key}
                      to={tab.to}
                      className={cn(
                        'hud-focus apple-segmented-item px-4 py-1.5 text-[13px]',
                        activeTab === tab.key ? 'bg-[#34D399] text-[#0A0D12]' : 'text-[#9AA3AF] hover:text-white'
                      )}
                    >
                      {tab.label}
                    </Link>
                  ))}
                </div>
              )}

              <h2 className="font-display text-2xl font-semibold tracking-tight text-white">{title}</h2>
              {subtitle && <p className="mt-1.5 text-sm text-[#9AA3AF]">{subtitle}</p>}
              <div className="mt-8">{children}</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Path Score spotlight ────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-white/10">
        <div className="auth-mesh-solo" />
        <Reveal className="relative z-10 mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#34D399]">The Core Metric</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
                One number. Zero guesswork.
              </h2>
              <p className="mt-4 max-w-md text-white/60 leading-relaxed">
                Your Path Score is a 0–100 readiness score computed from resume quality, skills,
                projects, and profile completeness — recalculated the moment you improve. No vague
                feedback. Just a number that moves when you do.
              </p>
            </div>

            <div className="flex justify-center">
              <PathScoreMockup />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Feature grid: asymmetric, each card its own visual ─────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20 border-t border-white/10">
        <Reveal>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#34D399]">Everything you need</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-white leading-tight max-w-xl">
            One platform, from resume to offer.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <FeatureCard
            span="lg:col-span-2"
            eyebrow="Live Jobs"
            title="Real listings, matched to you"
            desc="Frequently-refreshed job postings scored against your actual skills, so you know which ones are worth your time."
            visual={<LiveJobsVisual />}
            delay={0}
          />
          <FeatureCard
            eyebrow="Skill Roadmap"
            title="A plan, not a checklist"
            desc="A personalized week-by-week learning plan built from your actual gaps."
            visual={<RoadmapDotsVisual />}
            delay={0.06}
          />
          <FeatureCard
            eyebrow="Resume Builder"
            title="Built for the bots, too"
            desc="Live ATS scoring and AI writing help — every edit measurable."
            visual={<AtsRingVisual />}
            delay={0.12}
          />
          <FeatureCard
            eyebrow="Resume Strategy"
            title="See the gap, then close it"
            desc="AI audits your resume against your target role and flags exactly what's missing."
            visual={<KeywordGapVisual />}
            delay={0.18}
          />
          <FeatureCard
            eyebrow="Interview Prep"
            title="A coach that knows your gaps"
            desc="Role-specific mock interviews, scored in real time on relevance, depth, and communication."
            visual={<InterviewWaveVisual />}
            delay={0.24}
          />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <Reveal className="relative z-10 mx-auto max-w-2xl px-6 py-16 border-t border-white/10">
        <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#34D399] mb-5">
          Frequently Asked
        </p>
        <FAQSection limit={4} dark />
        <div className="mt-5 text-center">
          <a href="/faq" className="hud-focus inline-block font-mono text-xs font-semibold text-[#34D399] hover:underline rounded">
            View all FAQs →
          </a>
        </div>
      </Reveal>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/10 px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 border border-white/10">
              <span className="text-white font-bold text-xs font-sans tracking-tight">PP</span>
            </span>
            <span className="text-sm text-white/50">© {new Date().getFullYear()} PathPilot AI</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-white/50">
            <a href="https://github.com/Krishshah23" target="_blank" rel="noopener noreferrer" className="hud-focus flex items-center gap-1.5 hover:text-white transition-colors rounded">
              <Icon.Github size={13} /> GitHub
            </a>
            <a href="https://www.linkedin.com/in/kreesh" target="_blank" rel="noopener noreferrer" className="hud-focus flex items-center gap-1.5 hover:text-white transition-colors rounded">
              <Icon.Linkedin size={13} /> LinkedIn
            </a>
            <a href="/faq" className="hud-focus hover:text-white transition-colors rounded">FAQs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
