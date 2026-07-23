/**
 * models/User.js — User Mongoose Model
 *
 * WHY MONGOOSE MODELS?
 * Mongoose models are JavaScript classes that map to MongoDB collections.
 * They provide:
 *   - Schema definition (field names, types, validation, defaults)
 *   - Pre-save hooks (e.g. password hashing)
 *   - Instance methods (e.g. comparePassword)
 *   - Query building (User.find(), User.findById(), etc.)
 *
 * WHAT THIS MODEL STORES:
 * The `users` collection is the central identity record. Every other
 * collection (resumes, growthplans, opportunities, etc.) references a User
 * via a MongoDB ObjectId.
 *
 * EMBEDDED PROFILE (profileSchema):
 * The student's career profile (college, branch, dream role, skills) is
 * stored as an EMBEDDED sub-document inside the User document — NOT as a
 * separate collection. Reason: it's small, always fetched together with the
 * user, and has a strict 1:1 relationship. Embedding avoids a JOIN (lookup).
 *
 * PASSWORD SECURITY:
 * Passwords are NEVER stored in plaintext.
 * 1. The pre-save hook calls bcrypt.hash() with cost factor 12 (slow enough
 *    to resist brute force, fast enough for a login — ~250ms on modern hardware).
 * 2. `select: false` on the password field means it's NEVER returned by queries
 *    by default. You must explicitly request it with `.select('+password')`.
 * 3. `comparePassword()` uses bcrypt.compare() which is timing-safe.
 *
 * PUBLIC CARD:
 * Each user gets a unique 24-character hex `publicCardId` (generated from
 * 12 random bytes). When `isPublicCardEnabled` is true, their career summary
 * is accessible at /profile/:publicCardId without authentication.
 *
 * TIMESTAMPS:
 * { timestamps: true } adds `createdAt` and `updatedAt` fields automatically.
 * No need to set these manually anywhere in the codebase.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const { Schema } = mongoose;

/**
 * Embedded schema for onboarding profile data.
 *
 * { _id: false } prevents Mongoose from adding a _id field to this sub-document.
 * Since it's always accessed as user.profile (not queried independently), it
 * doesn't need its own _id.
 *
 * default: () => ({}) creates a fresh empty object per user document,
 * preventing the shared-reference bug where all users point to the same default object.
 */
const profileSchema = new Schema(
  {
    // Name of the student's college/university (set during onboarding Step 1)
    college: { type: String, trim: true, default: '' },

    // Engineering branch (e.g. 'Computer Science', 'Electronics') (onboarding Step 1)
    branch: { type: String, trim: true, default: '' },

    // Current semester (1–12) — used to calibrate the readiness score (onboarding Step 1)
    semester: { type: Number, min: 1, max: 12, default: null },

    // The role the student is targeting (e.g. 'Full Stack Developer') (onboarding Step 2)
    // This is the most important field — the entire AI pipeline uses it to tailor analysis
    dreamRole: { type: String, trim: true, default: '' },

    // Current skills the student knows (set during onboarding Step 3, updated via Profile)
    // Used in gap analysis to compare against role requirements
    skills: { type: [String], default: [] },

    // URL path to the student's latest uploaded resume (e.g. '/uploads/resumes/abc.pdf')
    // Updated by resume.controller.js after each successful upload
    resumeUrl: { type: String, default: '' },

    // URL path to the student's profile avatar (e.g. '/uploads/avatars/abc.jpg')
    // Updated by profile.controller.js after avatar upload
    avatarUrl: { type: String, default: '' },
  },
  { _id: false } // No MongoDB _id for this embedded sub-document
);

/**
 * Main User schema — the `users` collection in MongoDB.
 */
const userSchema = new Schema(
  {
    // Student's display name
    name: { type: String, required: true, trim: true },

    // Email address — used for login and email verification
    // unique: true creates a unique index (prevents duplicate emails)
    // lowercase: true normalizes to lowercase before saving
    // index: true creates a B-tree index for fast lookups by email
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Hashed password (bcrypt, cost 12).
    // select: false means this field is EXCLUDED from all query results by default.
    // To include it, use: User.findOne({ email }).select('+password')
    // This prevents accidentally returning the password hash in API responses.
    password: { type: String, required: true, minlength: 8, select: false },

    // User role — determines what routes/features are accessible
    // 'student': the default role for all registrations
    // 'admin': platform admins who can see all users and force data refreshes
    role: { type: String, enum: ['student', 'admin'], default: 'student' },

    // Email verification flag — registration emails a verification link.
    // Unverified accounts cannot access protected routes.
    isEmailVerified: { type: Boolean, default: false },

    // Set to true after the 3-step onboarding wizard is completed.
    // RequireOnboarding guard in guards.jsx redirects to /onboarding if false.
    onboardingCompleted: { type: Boolean, default: false },

    // Embedded profile sub-document (college, branch, dreamRole, skills, etc.)
    // default: () => ({}) creates a new empty object per document (not shared)
    profile: { type: profileSchema, default: () => ({}) },

    // Unique public identifier for the shareable career card.
    // 12 random bytes → 24 hex characters → e.g. 'a1b2c3d4e5f6a1b2c3d4e5f6'
    // Accessible at GET /profile/public/:publicCardId without auth
    publicCardId: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(12).toString('hex'),
    },

    // Whether the student has enabled their public career card for sharing
    isPublicCardEnabled: { type: Boolean, default: false },

    // Timestamp of the most recent successful login — shown in the admin panel
    lastLoginAt: { type: Date, default: null },
  },
  // timestamps: true automatically adds `createdAt` and `updatedAt` fields
  // Mongoose manages these — never set them manually in controllers
  { timestamps: true }
);

// ── Pre-save Hook: Password Hashing ──────────────────────────────────────────
/**
 * Runs before every user.save() call.
 * Only hashes the password if it was actually modified (avoids double-hashing
 * on profile updates that don't touch the password field).
 *
 * bcrypt.hash(password, saltRounds):
 * - Generates a random salt (prevents rainbow table attacks)
 * - Applies the bcrypt algorithm `saltRounds` times (12 = ~250ms — slow enough
 *   to make brute force impractical, fast enough for user experience)
 * - Returns a 60-character hash string that includes the salt
 */
userSchema.pre('save', async function hashPassword(next) {
  // Ensure publicCardId exists (defensive: default() should handle this)
  if (!this.publicCardId) {
    this.publicCardId = crypto.randomBytes(12).toString('hex');
  }

  // Skip hashing if password hasn't changed (e.g. updating profile, not password)
  if (!this.isModified('password')) return next();

  // Hash the plaintext password with bcrypt cost factor 12
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

// ── Instance Method: Password Comparison ──────────────────────────────────────
/**
 * Securely compares a plaintext candidate password against the stored hash.
 * Used in auth.controller.js → login().
 *
 * bcrypt.compare() is timing-safe — it takes the same amount of time regardless
 * of whether the password is correct or not, preventing timing side-channel attacks.
 *
 * @param {string} candidate - The plaintext password provided at login
 * @returns {Promise<boolean>} true if password matches, false if not
 */
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Instance Method: Safe Serialization ───────────────────────────────────────
/**
 * Returns the user document as a plain object with sensitive fields removed.
 * Called before sending user data to the client in API responses.
 *
 * this.toObject() converts the Mongoose Document to a plain JS object.
 * We then delete fields that should NEVER be sent to the browser.
 *
 * Note: `password` is already excluded by select:false, but it's deleted
 * here as a second layer of defense in case someone explicitly selected it.
 *
 * @returns {object} User document without password and Mongoose version key
 */
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject(); // Convert Mongoose Document → plain JS object
  delete obj.password;         // Remove password hash (sensitive)
  delete obj.__v;              // Remove Mongoose internal version key (__v)
  return obj;
};

// Create the Mongoose model from the schema.
// This registers the 'User' model and maps it to the 'users' MongoDB collection.
// (Mongoose pluralizes and lowercases the model name automatically)
export const User = mongoose.model('User', userSchema);
