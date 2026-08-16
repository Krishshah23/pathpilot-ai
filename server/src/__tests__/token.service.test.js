import { jest } from '@jest/globals';

jest.mock('../config/env.js', () => ({
  env: {
    jwt: {
      accessSecret: 'test-access-secret',
      accessExpires: '15m',
      refreshSecret: 'test-refresh-secret',
      refreshExpires: '7d',
    },
    tokenSecret: 'test-purpose-secret',
  },
}));

import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  signPurposeToken,
  verifyPurposeToken,
} from '../services/token.service.js';

describe('token.service', () => {
  const user = { _id: 'user-123', role: 'admin' };

  describe('access tokens', () => {
    it('round-trips sub and role through sign + verify', () => {
      const token = signAccessToken(user);
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.role).toBe('admin');
    });

    it('throws for a garbage/malformed token', () => {
      expect(() => verifyAccessToken('not-a-real-jwt')).toThrow();
    });

    it('throws for a token signed with a different secret', () => {
      // Simulates a forged token or a token signed before a secret rotation.
      const foreignToken = signPurposeTokenWithSecret(user._id, 'wrong-secret');
      expect(() => verifyAccessToken(foreignToken)).toThrow();
    });

    it('throws for an expired access token', () => {
      const expired = signAccessTokenWithExpiry(user, '-10s');
      expect(() => verifyAccessToken(expired)).toThrow(/expired|jwt expired/i);
    });

    it('refresh-token verifier rejects an access token signed with the access secret', () => {
      // Access and refresh tokens use different secrets — cross-verification must fail.
      const accessToken = signAccessToken(user);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  describe('refresh tokens', () => {
    it('round-trips sub through sign + verify (no role in payload)', () => {
      const token = signRefreshToken(user);
      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.role).toBeUndefined();
    });
  });

  describe('purpose-scoped tokens', () => {
    it('verifies successfully when the expected type matches', () => {
      const token = signPurposeToken('user-456', 'verify-email', '1h');
      const payload = verifyPurposeToken(token, 'verify-email');
      expect(payload.sub).toBe('user-456');
      expect(payload.type).toBe('verify-email');
    });

    it('rejects when the token type does not match what the caller expects', () => {
      // e.g. a reset-password token replayed against the verify-email endpoint
      const resetToken = signPurposeToken('user-456', 'reset-password', '1h');
      expect(() => verifyPurposeToken(resetToken, 'verify-email')).toThrow('Token type mismatch');
    });

    it('throws for an expired purpose token', () => {
      const expired = signPurposeToken('user-456', 'reset-password', '-1s');
      expect(() => verifyPurposeToken(expired, 'reset-password')).toThrow();
    });
  });
});

// ── Local helpers (use the real jsonwebtoken lib directly, mirroring what
// token.service.js does internally, to construct edge-case tokens) ──────────
import jwt from 'jsonwebtoken';

function signPurposeTokenWithSecret(sub, secret) {
  return jwt.sign({ sub }, secret, { expiresIn: '15m' });
}

function signAccessTokenWithExpiry(user, expiresIn) {
  return jwt.sign({ sub: user._id, role: user.role }, 'test-access-secret', { expiresIn });
}
