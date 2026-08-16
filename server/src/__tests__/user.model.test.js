import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

describe('User model — comparePassword', () => {
  it('resolves true for the correct plaintext password against a stored hash', async () => {
    const hash = await bcrypt.hash('correct-horse-battery', 12);
    const user = new User({ name: 'Test', email: 'a@b.com' });
    user.password = hash; // select:false only affects queries, not direct assignment
    await expect(user.comparePassword('correct-horse-battery')).resolves.toBe(true);
  });

  it('resolves false for an incorrect password', async () => {
    const hash = await bcrypt.hash('correct-horse-battery', 12);
    const user = new User({ name: 'Test', email: 'a@b.com' });
    user.password = hash;
    await expect(user.comparePassword('wrong-password')).resolves.toBe(false);
  });

  it('resolves false when the account has no password (Google-only account)', async () => {
    const user = new User({ name: 'Test', email: 'a@b.com', authProvider: 'google' });
    // password defaults to null per schema — never set for OAuth-only accounts
    await expect(user.comparePassword('anything')).resolves.toBe(false);
  });

  it('resolves false for an empty-string candidate against a real hash', async () => {
    const hash = await bcrypt.hash('correct-horse-battery', 12);
    const user = new User({ name: 'Test', email: 'a@b.com' });
    user.password = hash;
    await expect(user.comparePassword('')).resolves.toBe(false);
  });
});

describe('User model — password hashing mechanism (used by the pre-save hook)', () => {
  // userSchema.pre('save', ...) calls bcrypt.hash(password, 12) whenever
  // isModified('password') is true. These tests exercise that exact mechanism
  // directly with the real bcryptjs library — the same call the hook makes.
  // Triggering the hook itself would require an actual `.save()` against a live
  // MongoDB connection, which isn't available in this environment (no local
  // mongod/Docker, and mongodb-memory-server failed to install cleanly here —
  // see the test summary for details). The guard condition the hook relies on
  // (isModified('password')) is covered separately below without needing a save.

  it('produces a bcrypt hash (cost 12) that differs from the plaintext', async () => {
    const hash = await bcrypt.hash('myS3curePassword!', 12);
    expect(hash).not.toBe('myS3curePassword!');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('produces a verifiable hash — bcrypt.compare confirms the original password and rejects a wrong one', async () => {
    const hash = await bcrypt.hash('myS3curePassword!', 12);
    await expect(bcrypt.compare('myS3curePassword!', hash)).resolves.toBe(true);
    await expect(bcrypt.compare('wrong', hash)).resolves.toBe(false);
  });

  it('salts each hash uniquely — hashing the same password twice yields different hashes', async () => {
    const hashA = await bcrypt.hash('same-password', 12);
    const hashB = await bcrypt.hash('same-password', 12);
    expect(hashA).not.toBe(hashB);
  });
});

describe('User model — pre-save hook guard condition', () => {
  it('marks password as modified immediately after construction (hook would hash it on save)', () => {
    const user = new User({ name: 'Test', email: 'a@b.com', password: 'plaintext123' });
    expect(user.isModified('password')).toBe(true);
  });

  it('defaults password to null when not provided (no hashing needed for OAuth accounts)', () => {
    const user = new User({ name: 'Test', email: 'a@b.com' });
    expect(user.password).toBeNull();
  });
});
