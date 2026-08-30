import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import { recordConsent, withdrawConsent, getSession, CURRENT_NOTICE_VERSION } from '../services/vendorSessionService.js';
import { logActivity } from '../services/activityLogService.js';

export async function updateConsent(req, res) {
  try {
    const { vendorId } = req.params;
    const { whatsappId, consent, noticeVersion } = req.body;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    if (!whatsappId || typeof whatsappId !== 'string') {
      return res.status(400).json({ success: false, message: 'whatsappId is required' });
    }

    if (typeof consent !== 'boolean') {
      return res.status(400).json({ success: false, message: 'consent must be true or false' });
    }

    const vendorExists = await Vendor.exists({ _id: vendorId });
    if (!vendorExists) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const session = await recordConsent(vendorId, whatsappId, consent, noticeVersion || CURRENT_NOTICE_VERSION);

    logActivity(
      vendorId,
      'Consent Recorded',
      `Consent set to ${consent} via WhatsApp opt-in flow (notice ${session.NoticeVersion})`
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Consent recorded',
      data: {
        Vendor_ID: vendorId,
        SessionStatus: session.SessionStatus,
        Consent: session.Consent,
        ConsentTimestamp: session.ConsentTimestamp,
        NoticeVersion: session.NoticeVersion,
        ConsentWithdrawnAt: session.ConsentWithdrawnAt,
      },
    });
  } catch (err) {
    console.error('[vendorSessionController.updateConsent]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function revokeConsent(req, res) {
  try {
    const { vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    const session = await withdrawConsent(vendorId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'No session found for this vendor' });
    }

    logActivity(vendorId, 'Consent Withdrawn', 'Vendor withdrew location-tracking consent').catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Consent withdrawn - location tracking stopped',
      data: {
        Vendor_ID: vendorId,
        SessionStatus: session.SessionStatus,
        ConsentWithdrawnAt: session.ConsentWithdrawnAt,
      },
    });
  } catch (err) {
    console.error('[vendorSessionController.revokeConsent]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getVendorSession(req, res) {
  try {
    const { vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    const session = await getSession(vendorId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No session found for this vendor - consent flow not yet started',
      });
    }

    return res.status(200).json({ success: true, data: session });
  } catch (err) {
    console.error('[vendorSessionController.getVendorSession]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
