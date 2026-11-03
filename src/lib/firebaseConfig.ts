import type { FirebaseOptions } from 'firebase/app';

/**
 * The Commons' Firebase project, from the Firebase console (Project settings ›
 * Your apps › SDK setup and configuration), as described in COMMONS_SETUP.md.
 * These values are public by design: the security rules in firestore.rules
 * are what protect the data.
 *
 * Set this to null to put the Commons back in preview mode, which keeps posts
 * in each visitor's own browser.
 */
export const FIREBASE_CONFIG: FirebaseOptions | null = {
  apiKey: 'AIzaSyDvZRutUGzp9hOigjadQQdbOlYj5UADWZk',
  authDomain: 'scribe-archive-747a9.firebaseapp.com',
  projectId: 'scribe-archive-747a9',
  storageBucket: 'scribe-archive-747a9.firebasestorage.app',
  messagingSenderId: '252183198552',
  appId: '1:252183198552:web:4a801021342861a3ce032d',
};
