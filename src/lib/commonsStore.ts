import type { CommonsStore } from './commons';
import { createPreviewStore } from './commonsPreview';
import { FIREBASE_CONFIG } from './firebaseConfig';

let store: Promise<CommonsStore> | null = null;

/**
 * The Commons' one store for the visit: Firebase once it's configured, the
 * in-browser preview until then. Firebase's code only downloads when needed.
 */
export function getCommonsStore(): Promise<CommonsStore> {
  store ??= FIREBASE_CONFIG
    ? import('./commonsFirebase').then((m) => m.createFirebaseStore(FIREBASE_CONFIG!))
    : Promise.resolve(createPreviewStore());
  return store;
}
