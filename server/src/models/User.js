import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const { Schema } = mongoose;

/**
 * Embedded onboarding profile. Kept on the User document because it is small,
 * always loaded with the user, and unique per user (1:1).
 */
const profileSchema = new Schema(
  {
    college: { type: String, trim: true, default: '' },
    branch: { type: String, trim: true, default: '' },
    semester: { type: Number, min: 1, max: 12, default: null },
    dreamRole: { type: String, trim: true, default: '' },
    skills: { type: [String], default: [] },
    resumeUrl: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },

    isEmailVerified: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },

    profile: { type: profileSchema, default: () => ({}) },

    publicCardId: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(12).toString('hex'),
    },
    isPublicCardEnabled: { type: Boolean, default: false },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hash password whenever it is set/changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.publicCardId) {
    this.publicCardId = crypto.randomBytes(12).toString('hex');
  }
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Never leak sensitive fields when serializing to JSON.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

export const User = mongoose.model('User', userSchema);
