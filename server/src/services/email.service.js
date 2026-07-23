/**
 * services/email.service.js — Transactional Email Service via Nodemailer
 *
 * HYBRID DISPATCH BEHAVIOR:
 * - PRODUCTION / CONFIGURED SMTP: If `env.email.host` and `env.email.user` are set,
 *   Nodemailer creates an SMTP transport to dispatch real emails (TLS/SSL).
 * - DEVELOPMENT FALLBACK: If SMTP config is missing, Nodemailer is disabled and emails
 *   are logged directly to the server terminal output (`[DEV EMAIL]`). This allows full
 *   end-to-end testing of registration, verification, and password reset flows without
 *   configuring third-party SMTP servers or risking delivery failure in dev environments.
 */

import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Lazy-initialized Nodemailer transporter instance
let transporter = null;

// Initialize SMTP transporter if configuration is present
if (env.email.host && env.email.user) {
  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.port === 465, // True for port 465, false for 587 or other ports
    auth: { user: env.email.user, pass: env.email.pass },
  });
}

/**
 * Low-level dispatch handler. Uses Nodemailer if configured, otherwise logs preview text.
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML formatted email body
 * @param {string} options.previewText - Terminal preview summary for dev mode
 */
async function deliver({ to, subject, html, previewText }) {
  if (!transporter) {
    // Development mode console log
    // eslint-disable-next-line no-console
    console.log('\n📧 [DEV EMAIL] To:', to, '\n   Subject:', subject, '\n  ', previewText, '\n');
    return { dev: true };
  }
  return transporter.sendMail({ from: env.email.from, to, subject, html });
}

/**
 * Dispatches an account verification email containing a signed token link.
 * @param {object} user - User document
 * @param {string} token - Signed purpose token for email verification
 */
export function sendVerificationEmail(user, token) {
  const link = `${env.clientUrl}/verify-email?token=${token}`;
  return deliver({
    to: user.email,
    subject: 'Verify your PathPilot AI account',
    previewText: `Verify link: ${link}`,
    html: `
      <h2>Welcome to PathPilot AI, ${user.name} 👋</h2>
      <p>Confirm your email to activate your account.</p>
      <p><a href="${link}" style="background:#2B4C3F;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Verify Email</a></p>
      <p>Or paste this link in your browser: ${link}</p>
    `,
  });
}

/**
 * Dispatches a password reset link email.
 * @param {object} user - User document
 * @param {string} token - Signed purpose token for password reset
 */
export function sendPasswordResetEmail(user, token) {
  const link = `${env.clientUrl}/reset-password?token=${token}`;
  return deliver({
    to: user.email,
    subject: 'Reset your PathPilot AI password',
    previewText: `Reset link: ${link}`,
    html: `
      <h2>Password reset requested</h2>
      <p>Click below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${link}" style="background:#2B4C3F;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
