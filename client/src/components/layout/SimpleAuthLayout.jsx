/**
 * components/layout/SimpleAuthLayout.jsx — Minimal Dark Auth Shell
 *
 * Used by the secondary auth flows (forgot password, reset password, verify
 * email) — these are functional utility screens, not the marketing front
 * door, so they get a simple centered card in the same dark "flight deck"
 * tone as AuthLayout without any of its landing-page content.
 */

import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

export function SimpleAuthLayout({ title, subtitle, children }) {
  const reduce = useReducedMotion();

  return (
    <div className="flight-deck-bg min-h-screen flex flex-col relative overflow-hidden">
      <div className="auth-grain" />
      <div className="auth-mesh-solo" />
      <div className="auth-grid-overlay" />

      <header className="relative z-10 px-6 py-5">
        <Link to="/login" className="inline-flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/10">
            <span className="text-white font-bold text-sm font-sans tracking-tight">PP</span>
          </span>
          <span className="font-serif font-bold text-white text-lg tracking-tight">PathPilot</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="hud-card w-full max-w-md rounded-[28px] border border-white/10 p-8 sm:p-10"
          style={{
            background: 'rgba(22, 24, 28, 0.72)',
            backdropFilter: 'blur(28px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
            boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.55)',
          }}
        >
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-[#9AA3AF]">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </motion.div>
      </main>

      <footer className="relative z-10 px-6 py-6 text-center text-xs text-white/30">
        © {new Date().getFullYear()} PathPilot AI
      </footer>
    </div>
  );
}
