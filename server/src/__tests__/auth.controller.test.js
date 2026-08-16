import { jest } from '@jest/globals';

jest.mock('../config/env.js', () => ({
  env: {
    isProd: false,
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
  User: { findOne: jest.fn(), create: jest.fn() },
}));

jest.mock('../services/email.service.js', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

import { register, login } from '../controllers/auth.controller.js';
import { User } from '../models/User.js';
import { sendVerificationEmail } from '../services/email.service.js';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
}

function fakeUser(overrides = {}) {
  return {
    _id: 'user-123',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'student',
    comparePassword: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(undefined),
    toSafeJSON: jest.fn().mockReturnValue({ _id: 'user-123', name: 'Ada Lovelace', email: 'ada@example.com' }),
    ...overrides,
  };
}

describe('auth.controller — register', () => {
  it('creates the account, issues a session, and sends a verification email on success', async () => {
    User.findOne.mockResolvedValue(null); // no existing account with this email
    const created = fakeUser();
    User.create.mockResolvedValue(created);

    const req = { body: { name: 'Ada Lovelace', email: 'ada@example.com', password: 'password123' } };
    const res = mockRes();
    const next = jest.fn();

    await register(req, res, next);

    expect(User.create).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
    });
    expect(sendVerificationEmail).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'ppRefresh',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, path: '/api/auth' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.accessToken).toEqual(expect.any(String));
    expect(payload.data.user).toEqual(created.toSafeJSON());
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 409 Conflict when the email is already registered', async () => {
    User.findOne.mockResolvedValue(fakeUser()); // account already exists
    const req = { body: { name: 'Ada Lovelace', email: 'ada@example.com', password: 'password123' } };
    const res = mockRes();
    const next = jest.fn();

    await register(req, res, next);

    expect(User.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, message: 'An account with this email already exists' })
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  it('still completes registration (issues a session) even when the verification email fails to send', async () => {
    // auth.controller.js deliberately treats email delivery as fire-and-forget —
    // an SMTP outage should never block account creation.
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(fakeUser());
    sendVerificationEmail.mockRejectedValueOnce(new Error('SMTP down'));

    const req = { body: { name: 'Ada Lovelace', email: 'ada@example.com', password: 'password123' } };
    const res = mockRes();
    const next = jest.fn();

    await register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('auth.controller — login', () => {
  it('issues a session and updates lastLoginAt for correct credentials', async () => {
    const user = fakeUser();
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

    const req = { body: { email: 'ada@example.com', password: 'password123' } };
    const res = mockRes();
    const next = jest.fn();

    await login(req, res, next);

    expect(user.comparePassword).toHaveBeenCalledWith('password123');
    expect(user.save).toHaveBeenCalled(); // persists lastLoginAt
    expect(res.cookie).toHaveBeenCalledWith('ppRefresh', expect.any(String), expect.any(Object));
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.accessToken).toEqual(expect.any(String));
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 for an email that does not exist', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const req = { body: { email: 'nobody@example.com', password: 'password123' } };
    const res = mockRes();
    const next = jest.fn();

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Invalid email or password' })
    );
    expect(res.json).not.toHaveBeenCalled();
  });

  it('rejects with 401 for a wrong password, without revealing which part was wrong', async () => {
    const user = fakeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

    const req = { body: { email: 'ada@example.com', password: 'wrong-password' } };
    const res = mockRes();
    const next = jest.fn();

    await login(req, res, next);

    expect(user.save).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Invalid email or password' })
    );
  });
});
