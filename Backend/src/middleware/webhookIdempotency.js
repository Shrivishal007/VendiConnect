import ProcessedEvent from '../models/ProcessedEvent.js';

export function webhookIdempotency(req, res, next) {
  const messageId = extractMessageId(req.body);

  if (!messageId) {
    return next();
  }

  ProcessedEvent.create({ MessageId: messageId })
    .then(() => {
      req.webhookMessageId = messageId;
      return next();
    })
    .catch((err) => {
      if (err.code === 11000) {
        console.log(`[webhookIdempotency] Duplicate delivery for message ${messageId} - acking without reprocessing`);
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      console.error('[webhookIdempotency] Failed to record processed event:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    });
}

function extractMessageId(body) {
  try {
    return body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id || null;
  } catch {
    return null;
  }
}
