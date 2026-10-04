import { getMessaging } from '../config/firebaseAdmin.js';
import { retryWithBackoff, CircuitBreaker } from '../utils/retryWithBackoff.js';

const fcmCircuitBreaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 30_000, label: 'fcm' });

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
    const messageId = await fcmCircuitBreaker.execute(() =>
      retryWithBackoff(
        () =>
          messaging.send({
            token,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
          }),
        {
          label: 'fcm.send',
          maxRetries: 2,
          isRetryable: (err) =>
            err.code !== 'messaging/registration-token-not-registered' &&
            err.code !== 'messaging/invalid-registration-token',
        }
      )
    );

    return { success: true, messageId };
  } catch (err) {
    const invalidToken =
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token';

    console.error('[fcmService] Push send failed:', err.code || err.message);

    return { success: false, error: err.code || err.message, invalidToken };
  }
}
