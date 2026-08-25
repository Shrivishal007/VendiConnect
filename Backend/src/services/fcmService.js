/**
 * services/fcmService.js  *** NEW THIS WEEK ***
 * -----------------------------------------------------------------------
 * Thin wrapper around Firebase Admin's messaging().send(). Isolated into
 * its own service so proximityWorker.js doesn't need to know anything
 * about the Firebase SDK's message payload shape - it just calls
 * sendPushNotification(token, title, body, data).
 * -----------------------------------------------------------------------
 */

import { getMessaging } from '../config/firebaseAdmin.js';

/**
 * Sends a single FCM push notification to one device token.
 *
 * Deliberately swallows and logs (rather than throws) most delivery
 * failures - a failed push to one resident should never abort the
 * proximity-matching loop for the other residents in range. The one
 * exception the caller may care about is an invalid/expired token,
 * which is returned in the result so the caller can optionally clean up
 * `Resident.FcmToken` (left as a TODO / teammate integration point,
 * since token lifecycle ownership sits with the frontend team).
 *
 * @param {string} token FCM device registration token
 * @param {string} title Notification title
 * @param {string} body Notification body
 * @param {Object} [data] Optional key-value payload for the app to handle on tap
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string, invalidToken?: boolean }>}
 */
export async function sendPushNotification(token, title, body, data = {}) {
  const messaging = getMessaging();

  if (!messaging) {
    console.warn('[fcmService] Firebase Admin not initialized - skipping push send');
    return { success: false, error: 'FIREBASE_NOT_INITIALIZED' };
  }

  if (!token) {
    return { success: false, error: 'MISSING_FCM_TOKEN' };
  }

  try {
    const messageId = await messaging.send({
      token,
      notification: { title, body },
      // All FCM data payload values MUST be strings.
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    });

    return { success: true, messageId };
  } catch (err) {
    // Common Firebase error codes worth distinguishing:
    // messaging/registration-token-not-registered -> token is dead, should be purged.
    const invalidToken =
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token';

    console.error('[fcmService] Push send failed:', err.code || err.message);

    return { success: false, error: err.code || err.message, invalidToken };
  }
}
