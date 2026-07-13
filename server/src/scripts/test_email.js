import dotenv from 'dotenv';
dotenv.config();

import { sendVerificationEmail } from '../services/email.service.js';

const mockUser = {
  name: 'Test User',
  email: 'krishshah2376@gmail.com'
};

async function test() {
  try {
    console.log('Sending verification email to krishshah2376@gmail.com using the service...');
    const result = await sendVerificationEmail(mockUser, 'test-verification-token');
    console.log('Verification email sent successfully! Result:', result);
  } catch (err) {
    console.error('sendVerificationEmail failed with error:', err);
  }
}

test();
