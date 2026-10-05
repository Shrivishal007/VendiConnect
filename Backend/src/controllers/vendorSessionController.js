import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import { normalizePhoneNumber } from '../utils/privacy.js';
import { recordConsent, withdrawConsent, getSession } from '../services/vendorSessionService.js';

// Update vendor consent status
export async function updateConsent(req, res) {
  try {
    const { vendorId } = req.params;
    const { whatsappId, consent } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    if (!whatsappId || typeof whatsappId !== 'string') {
      return res.status(400).json({ success: false, message: 'whatsappId is required' });
    }

    const digitCount = normalizePhoneNumber(whatsappId).replace(/\D/g, '').length;
    if (digitCount < 7 || digitCount > 15) {
      return res.status(400).json({ success: false, message: 'whatsappId must be a valid phone number' });
    }

    if (typeof consent !== 'boolean') {
      return res.status(400).json({ success: false, message: 'consent must be true or false' });
    }

    const vendorExists = await Vendor.exists({ _id: vendorId });
    if (!vendorExists) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const session = await recordConsent(vendorId, whatsappId, consent);

    return res.status(200).json({
      success: true,
      message: 'Consent recorded',
      data: {
        Vendor_ID: vendorId,
        SessionStatus: session.Status,
        Consent: session.Consent,
        ConsentTimestamp: session.ConsentTimestamp,
        ConsentWithdrawnAt: session.ConsentWithdrawnAt,
      },
    });
  } catch (err) {
    console.error('[vendorSessionController.updateConsent]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Revoke vendor consent
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

    return res.status(200).json({
      success: true,
      message: 'Consent withdrawn - location tracking stopped',
      data: {
        Vendor_ID: vendorId,
        SessionStatus: session.Status,
        ConsentWithdrawnAt: session.ConsentWithdrawnAt,
      },
    });
  } catch (err) {
    console.error('[vendorSessionController.revokeConsent]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Get vendor session details (admin only; the stored phone hash is never returned)
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

    return res.status(200).json({
      success: true,
      data: {
        Vendor_ID: session.Vendor_ID,
        Status: session.Status,
        Consent: session.Consent,
        ConsentTimestamp: session.ConsentTimestamp,
        ConsentWithdrawnAt: session.ConsentWithdrawnAt,
        LastActive: session.LastActive,
      },
    });
  } catch (err) {
    console.error('[vendorSessionController.getVendorSession]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
