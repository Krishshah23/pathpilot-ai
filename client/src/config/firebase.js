/**
 * config/firebase.js — Firebase Client SDK Initialization
 *
 * Initializes the Firebase app used for "Continue with Google". Only the Auth
 * module is used — PathPilot's own Node/Express backend handles everything else
 * (users, resumes, sessions). Firebase here is purely an identity provider: the
 * client gets a Google idToken via signInWithPopup(), then hands it to
 * POST /api/auth/google, which verifies it with firebase-admin and issues our
 * own JWT session.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

/**
 * Opens the Google account picker popup and returns the signed-in user's
 * Firebase idToken, ready to send to POST /api/auth/google.
 * @returns {Promise<string>} idToken
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user.getIdToken();
}
