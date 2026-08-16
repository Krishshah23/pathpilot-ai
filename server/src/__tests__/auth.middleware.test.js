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

jest.mock('../models/User.js', () => ({
  User: { findById: jest.fn() },
}));

import { protect, authorize } from '../middleware/auth.middleware.js';
import { signAccessToken } from '../services/token.service.js';
import { User } from '../models/User.js';

function mockRes() {
  return {};
}

describe('auth.middleware — protect', () => {
  const dbUser = { _id: 'user-123', role: 'student' };

  it('attaches req.user and calls next() with no error for a valid Bearer token', async () => {
    User.findById.mockResolvedValue(dbUser);
    const token = signAccessToken({ _id: 'user-123', role: 'student' });
    const req = { headers: { authorization: `Bearer ${token}` }, query: {} };
    const next = jest.fn();

    await protect(req, mockRes(), next);

    expect(User.findById).toHaveBeenCalledWith('user-123');
    expect(req.user).toBe(dbUser);
    expect(next).toHaveBeenCalledWith(); // called with no arguments = success
  });

  it('falls back to ?token= query param when there is no Authorization header', async () => {
    User.findById.mockResolvedValue(dbUser);
    const token = signAccessToken({ _id: 'user-123', role: 'student' });
    const req = { headers: {}, query: { token } };
    const next = jest.fn();

    await protect(req, mockRes(), next);

    expect(req.user).toBe(dbUser);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects with 401 when there is no token anywhere', async () => {
    const req = { headers: {}, query: {} };
    const next = jest.fn();

    await protect(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Authentication required' })
    );
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('rejects with 401 when the Authorization header is malformed (missing "Bearer " prefix)', async () => {
    // e.g. a client sending the raw token without the scheme prefix
    const req = { headers: { authorization: 'sometoken.without.scheme' }, query: {} };
    const next = jest.fn();

    await protect(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Authentication required' })
    );
  });

  it('rejects with 401 for a garbage/invalid token', async () => {
    const req = { headers: { authorization: 'Bearer not-a-real-jwt' }, query: {} };
    const next = jest.fn();

    await protect(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Invalid or expired token' })
    );
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('rejects with 401 for an expired token', async () => {
    const token = signAccessTokenWithExpiry({ _id: 'user-123', role: 'student' }, '-10s');
    const req = { headers: { authorization: `Bearer ${token}` }, query: {} };
    const next = jest.fn();

    await protect(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Invalid or expired token' })
    );
  });

  it('rejects with 401 when the token is valid but the user was deleted', async () => {
    User.findById.mockResolvedValue(null);
    const token = signAccessToken({ _id: 'user-123', role: 'student' });
    const req = { headers: { authorization: `Bearer ${token}` }, query: {} };
    const next = jest.fn();

    await protect(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'User no longer exists' })
    );
  });
});

describe('auth.middleware — authorize', () => {
  it('calls next() with no error when the user role is in the allowed list', () => {
    const req = { user: { role: 'admin' } };
    const next = jest.fn();

    authorize('admin')(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows any role in a multi-role allow list', () => {
    const req = { user: { role: 'student' } };
    const next = jest.fn();

    authorize('admin', 'student')(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() with a 403 ApiError when the user role is not allowed', () => {
    const req = { user: { role: 'student' } };
    const next = jest.fn();

    authorize('admin')(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'You do not have access to this resource' })
    );
  });
});

// ── Local helper for constructing an already-expired access token ───────────
import jwt from 'jsonwebtoken';
function signAccessTokenWithExpiry(user, expiresIn) {
  return jwt.sign({ sub: user._id, role: user.role }, 'test-access-secret', { expiresIn });
}
