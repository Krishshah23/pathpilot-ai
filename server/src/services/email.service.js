import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Email service. If SMTP credentials are configured we send real mail;
 * otherwise (dev mode) we log the message + link to the console so the auth
 * flow is fully testable without an SMTP account.
 */
let transporter = null;

if (env.email.host && env.email.user) {
  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.port === 465,
    auth: { user: env.email.user, pass: env.email.pass },
  });
}

async function deliver({ to, subject, html, previewText }) {
  if (!transporter) {
    // eslint-disable-next-line no-console
    console.log('\n📧 [DEV EMAIL] To:', to, '\n   Subject:', subject, '\n  ', previewText, '\n');
    return { dev: true };
  }
  return transporter.sendMail({ from: env.email.from, to, subject, html });
}

export function sendVerificationEmail(user, token) {
  const link = `${env.clientUrl}/verify-email?token=${token}`;
  return deliver({
    to: user.email,
    subject: 'Verify your PathPilot AI account',
    previewText: `Verify link: ${link}`,
    html: `
      <h2>Welcome to PathPilot AI, ${user.name} 👋</h2>
      <p>Confirm your email to activate your account.</p>
      <p><a href="${link}" style="background:#6366f1;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Verify Email</a></p>
      <p>Or paste this link: ${link}</p>
    `,
  });
}

export function sendPasswordResetEmail(user, token) {
  const link = `${env.clientUrl}/reset-password?token=${token}`;
  return deliver({
    to: user.email,
    subject: 'Reset your PathPilot AI password',
    previewText: `Reset link: ${link}`,
    html: `
      <h2>Password reset requested</h2>
      <p>Click below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${link}" style="background:#6366f1;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
