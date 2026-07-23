/**
 * services/token.service.js — JSON Web Token (JWT) Management Service
 *
 * AUTHENTICATION ARCHITECTURE:
 * PathPilot AI uses stateless JWTs signed using JSONWebToken library.
 *
 * TOKEN SCHEMES:
 * 1. ACCESS TOKEN:
 *    - Payload: { sub: userId, role: user.role }
 *    - Secret: env.jwt.accessSecret
 *    - Lifetime: Short (default 15 mins)
 *    - Purpose: Authenticates every protected REST request via `Authorization: Bearer <token>`
 *
 * 2. REFRESH TOKEN:
 *    - Payload: { sub: userId }
 *    - Secret: env.jwt.refreshSecret
 *    - Lifetime: Long (default 7 days)
 *    - Purpose: Minting new access tokens without requiring user credentials
 *
 * 3. PURPOSE-SCOPED TOKENS:
 *    - Payload: { sub: userId, type: 'verify-email' | 'reset-password' }
 *    - Secret: env.tokenSecret
 *    - Lifetime: Short (1 hour)
 *    - Purpose: One-time email actions (verification links & password resets)
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Signs a short-lived access token for API request authorization.
 * @param {object} user - User document containing _id and role
 * @returns {string} Signed JWT access token
 */
export function signAccessToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  });
}

/**
 * Signs a long-lived refresh token sent to the client via HttpOnly cookie.
 * @param {object} user - User document containing _id
 * @returns {string} Signed JWT refresh token
 */
export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires,
  });
}

/**
 * Verifies and decodes an access token.
 * Throws JsonWebTokenError or TokenExpiredError if invalid or expired.
 * @param {string} token
 * @returns {object} Token payload containing sub and role
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

/**
 * Verifies and decodes a refresh token.
 * @param {string} token
 * @returns {object} Token payload containing sub
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

/**
 * Signs a purpose-scoped single-use token for email links.
 * @param {string} userId - User ID string or ObjectId
 * @param {'verify-email'|'reset-password'} type - Expected token purpose
 * @param {string} [expiresIn='1h'] - Lifetime duration string
 * @returns {string} Signed JWT token
 */
export function signPurposeToken(userId, type, expiresIn = '1h') {
  return jwt.sign({ sub: userId, type }, env.tokenSecret, { expiresIn });
}

/**
 * Verifies a purpose token and asserts that its intended type matches expectations.
 * @param {string} token - Raw JWT token
 * @param {'verify-email'|'reset-password'} expectedType - Required token type
 * @returns {object} Token payload
 */
export function verifyPurposeToken(token, expectedType) {
  const payload = jwt.verify(token, env.tokenSecret);
  if (payload.type !== expectedType) {
    throw new Error('Token type mismatch');
  }
  return payload;
}
