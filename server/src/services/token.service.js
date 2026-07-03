import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * JWT helpers. Access tokens authenticate API calls; refresh tokens mint new
 * access tokens. Email/reset tokens are short-lived and scoped by `type`.
 */

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

/**
 * Purpose-scoped token for email verification and password reset.
 * @param {'verify-email'|'reset-password'} type
 */
export function signPurposeToken(userId, type, expiresIn = '1h') {
  return jwt.sign({ sub: userId, type }, env.tokenSecret, { expiresIn });
}

export function verifyPurposeToken(token, expectedType) {
  const payload = jwt.verify(token, env.tokenSecret);
  if (payload.type !== expectedType) {
    throw new Error('Token type mismatch');
  }
  return payload;
}
