/**
 * pages/LandingPage.jsx — Marketing Front Door ("/")
 *
 * Reachable by everyone, logged in or not (same pattern most SaaS marketing
 * sites use). Only the nav CTA changes based on auth state. Hero + four
 * alternating feature sections (Resume Strategy, Skill Roadmap, Live Jobs,
 * Interview Prep) each pair real product copy with a small mockup styled
 * after the actual screens, then the shared product Footer.
 */

import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/icons';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { Footer } from '@/components/layout/Footer';
import {
  ScoreBreakdownVisual,
  RoadmapVisual,
  LiveJobsVisual,
  InterviewVisual,
} from '@/components/landing/LandingVisuals';

const FEATURES = [
  {
    eyebrow: 'Resume Strategy',
    title: 'See the gap, then close it.',
    desc: 'AI audits your resume against your target role — skill coverage, project depth, experience signals, ATS health — and tells you exactly what to fix first.',
    visual: <ScoreBreakdownVisual />,
  },
  {
    eyebrow: 'Skill Roadmap',
    title: 'A plan, not a to-do list.',
    desc: 'A personalized week-by-week learning plan built from your actual gaps, with curated resources for each skill and progress that carries over as your target role evolves.',
    visual: <RoadmapVisual />,
  },
  {
    eyebrow: 'Live Jobs',
    title: 'Real listings, matched to you.',
    desc: 'Frequently-refreshed job postings pulled straight from the market, scored against your actual skills so you know which ones are worth your time.',
    visual: <LiveJobsVisual />,
  },
  {
    eyebrow: 'Interview Prep',
    title: 'Practice with a coach that knows your gaps.',
    desc: 'Role-specific mock interviews, scored in real time on relevance, depth, and communication — so feedback is specific, not generic.',
    visual: <InterviewVisual />,
  },
];

/** Fades a section up into view once, skipping the motion under prefers-reduced-motion. */
function Reveal({ children, className, delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: reduce ? 0.15 : 0.5, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function LandingNav() {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 sm:px-12 py-6">
      <Link to="/" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-brand text-white font-display text-[13px] font-semibold">
          PP
        </span>
        <span className="font-display text-lg text-ink">PathPilot</span>
      </Link>

      <Link
        to={isAuthenticated ? '/dashboard' : '/login'}
        className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/85 transition-colors"
      >
        {isAuthenticated ? 'Dashboard' : 'Sign in'}
        <Icon.ArrowRight size={14} />
      </Link>
    </nav>
  );
}

function Hero() {
  const { isAuthenticated } = useAuth();
  const reduce = useReducedMotion();

  return (
    <section className="mx-auto max-w-6xl px-6 pt-8 pb-20">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
            AI Career Operating System
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl font-medium leading-[1.12] text-ink">
            Know exactly how ready you are.
            <br />
            <span className="text-brand italic">And exactly what closes the gap.</span>
          </h1>
          <p className="mt-5 max-w-lg text-muted text-[15px] leading-relaxed">
            PathPilot turns your resume, skills, and goals into one Path Score — then builds
            the roadmap, finds the jobs, and coaches your interviews to get you there.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-soft transition-colors"
            >
              {isAuthenticated ? 'Go to dashboard' : 'Get started'} <Icon.ArrowRight size={15} />
            </Link>
            {!isAuthenticated && (
              <Link to="/login" className="text-sm font-semibold text-muted hover:text-ink transition-colors">
                Already have an account?
              </Link>
            )}
          </div>

          <p className="mt-8 flex items-center gap-2 text-xs text-faint">
            <Icon.Sparkles size={13} /> Powered by advanced AI
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.6, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.15 }}
          className="flex justify-center"
        >
          <div className="card w-full max-w-sm p-8 flex flex-col items-center text-center">
            <ScoreGauge score={94} label="Excellent" size={180} />
            <div className="mt-6 w-full space-y-2">
              {[
                { label: 'Resume Quality', pct: 100 },
                { label: 'Skills', pct: 100 },
                { label: 'Projects', pct: 90 },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">{f.label}</span>
                  <span className="font-mono text-ink">{f.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeatureSection({ eyebrow, title, desc, visual, reversed, delay }) {
  return (
    <section className="border-t border-line">
      <Reveal className="mx-auto max-w-6xl px-6 py-16" delay={delay}>
        <div className={`grid gap-12 lg:grid-cols-2 lg:items-center ${reversed ? 'lg:[&>*:first-child]:order-2' : ''}`}>
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl font-medium text-ink leading-tight max-w-md">
              {title}
            </h2>
            <p className="mt-4 max-w-md text-muted text-sm leading-relaxed">{desc}</p>
          </div>
          <div>{visual}</div>
        </div>
      </Reveal>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <LandingNav />
      <Hero />

      {FEATURES.map((f, i) => (
        <FeatureSection key={f.eyebrow} {...f} reversed={i % 2 === 1} delay={0} />
      ))}

      <div className="mx-auto max-w-6xl px-6">
        <Footer />
      </div>
    </div>
  );
}
