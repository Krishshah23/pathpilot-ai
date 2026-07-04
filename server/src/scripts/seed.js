/**
 * Seed script — creates demo users for development/testing.
 *
 * Usage:
 *   cd server
 *   node src/scripts/seed.js
 *
 * This is idempotent: if a user with the same email already exists,
 * it skips that user rather than duplicating.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../models/User.js';

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌  MONGODB_URI is not set in .env');
  process.exit(1);
}

const DEMO_USERS = [
  {
    name: 'Admin User',
    email: 'admin@pathpilot.ai',
    password: 'Admin@1234',
    role: 'admin',
    isEmailVerified: true,
    onboardingCompleted: true,
    profile: {
      college: 'PathPilot University',
      branch: 'Computer Science',
      semester: 8,
      dreamRole: 'Full Stack Developer',
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Python', 'Docker', 'AWS'],
    },
  },
  {
    name: 'Demo Student',
    email: 'student@pathpilot.ai',
    password: 'Student@1234',
    role: 'student',
    isEmailVerified: true,
    onboardingCompleted: true,
    profile: {
      college: 'IIT Mumbai',
      branch: 'Information Technology',
      semester: 6,
      dreamRole: 'Frontend Developer',
      skills: ['HTML/CSS', 'JavaScript', 'React', 'Git', 'Tailwind CSS', 'TypeScript'],
    },
  },
  {
    name: 'New Student',
    email: 'new@pathpilot.ai',
    password: 'NewUser@1234',
    role: 'student',
    isEmailVerified: true,
    onboardingCompleted: false,
    profile: {},
  },
];

async function seed() {
  console.log('🌱 Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected.\n');

  for (const userData of DEMO_USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      console.log(`⏭  Skipped ${userData.email} (already exists)`);
      continue;
    }

    const user = await User.create(userData);
    console.log(`✅ Created ${user.role.padEnd(7)} → ${user.email}`);
  }

  console.log('\n──────────────────────────────────────────');
  console.log('📋 Demo Credentials:');
  console.log('──────────────────────────────────────────');
  console.log('Admin:    admin@pathpilot.ai   / Admin@1234');
  console.log('Student:  student@pathpilot.ai / Student@1234');
  console.log('New User: new@pathpilot.ai     / NewUser@1234');
  console.log('──────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Seed complete.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
