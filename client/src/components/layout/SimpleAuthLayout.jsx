/**
 * components/layout/SimpleAuthLayout.jsx — Minimal Auth Shell
 *
 * Used by the secondary auth flows (forgot password, reset password, verify
 * email) — functional utility screens, not the marketing front door, so they
 * get a simple centered card instead of AuthLayout's full hero/orbit graphic.
 * Same light design system as the rest of the product.
 */

import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

export function SimpleAuthLayout({ title, subtitle, children }) {
  const reduce = useReducedMotion();

  return (
    <div className="auth-dot-grid min-h-screen bg-canvas flex flex-col">
      <header className="px-6 sm:px-12 py-6">
        <Link to="/login" className="inline-flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-brand text-white font-display text-[13px] font-semibold">
            PP
          </span>
          <span className="font-display text-lg text-ink">PathPilot</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="card w-full max-w-md p-8 sm:p-9"
        >
          <h1 className="font-display text-2xl font-medium text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </motion.div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-faint">
        © {new Date().getFullYear()} PathPilot AI
      </footer>
    </div>
  );
}
