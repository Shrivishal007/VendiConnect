import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import Sessions from '../models/Sessions.js';
import { hashPhoneNumber } from '../utils/privacy.js';

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

    if (typeof consent !== 'boolean') {
      return res.status(400).json({ success: false, message: 'consent must be true or false' });
    }

    const vendorExists = await Vendor.exists({ _id: vendorId });
    if (!vendorExists) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const session = await Sessions.findOneAndUpdate(
      { Vendor_ID: vendorId },
      {
        Vendor_ID: vendorId,
        Phone: hashPhoneNumber(whatsappId),
        Consent: consent,
        Status: consent ? 'ACTIVE' : 'INACTIVE',
        ConsentTimestamp: consent ? new Date() : null,
        ConsentWithdrawnAt: consent ? null : new Date(),
        LastActive: new Date(),
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

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

    const session = await Sessions.findOneAndUpdate(
      { Vendor_ID: vendorId },
      {
        Consent: false,
        Status: 'REVOKED',
        ConsentWithdrawnAt: new Date(),
      },
      { returnDocument: 'after' }
    );

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

// Get vendor session details
export async function getVendorSession(req, res) {
  try {
    const { vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendorId' });
    }

    const session = await Sessions.findOne({ Vendor_ID: vendorId }).lean();

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
