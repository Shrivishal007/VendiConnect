import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging as getFirebaseMessaging } from 'firebase-admin/messaging';

let firebaseApp = null;

function initFirebaseAdmin() {
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
    const serviceAccount = JSON.parse(rawServiceAccount);

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

initFirebaseAdmin();

export function getMessaging() {
  if (!firebaseApp) {
    return null;
  }

  return getFirebaseMessaging(firebaseApp);
}
