/**
 * config/firebaseAdmin.js
 * -----------------------------------------------------------------------
 * Initializes the Firebase Admin SDK exactly once and exports the
 * Firebase Cloud Messaging handle used by services/fcmService.js.
 *
 * Credential source:
 * FIREBASE_SERVICE_ACCOUNT_JSON environment variable containing the
 * complete Firebase service-account JSON as a single-line string.
 * -----------------------------------------------------------------------
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging as getFirebaseMessaging } from 'firebase-admin/messaging';

let firebaseApp = null;

function initFirebaseAdmin() {
  // Prevent duplicate initialization
  if (firebaseApp) {
    return firebaseApp;
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!rawServiceAccount) {
    console.warn(
      '[Firebase] FIREBASE_SERVICE_ACCOUNT_JSON is not set - ' +
        'push notifications will fail. Set it in .env to enable FCM.'
    );

    return null;
  }

  try {
    // Parse the service-account JSON from the environment variable
    const serviceAccount = JSON.parse(rawServiceAccount);

    // Reuse an existing Firebase Admin app if one already exists
    const existingApps = getApps();

    if (existingApps.length > 0) {
      firebaseApp = existingApps[0];
    } else {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });
    }

    console.log('[Firebase] Admin SDK initialized');

    return firebaseApp;
  } catch (err) {
    console.error(
      '[Firebase] Failed to parse/initialize service account:',
      err.message
    );

    return null;
  }
}

// Initialize Firebase Admin when this module is imported
initFirebaseAdmin();

/**
 * Returns the Firebase Cloud Messaging handle.
 *
 * Returns null if Firebase Admin could not be initialized.
 */
export function getMessaging() {
  if (!firebaseApp) {
    return null;
  }

  return getFirebaseMessaging(firebaseApp);
}
