/**
 * controllers/vendorSessionController.js  *** NEW ***
 * -----------------------------------------------------------------------
 * POST /api/vendors/:vendorId/session/consent - called by the WhatsApp
 * webhook layer once it has parsed a vendor's reply to a consent
 * opt-in/opt-out prompt. Same role-boundary pattern as
 * locationController: this file has no knowledge of WhatsApp payload
 * formats, it just receives already-parsed { whatsappId, consent }.
 *
 * GET /api/vendors/:vendorId/session - read-only session status check,
 * useful for the admin dashboard or for the messaging service to check
 * "has this vendor already consented" before sending a fresh prompt.
 * -----------------------------------------------------------------------
 */

import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import { recordConsent, getSession } from '../services/vendorSessionService.js';
import { logActivity } from '../services/activityLogService.js';

/**
 * POST /api/vendors/:vendorId/session/consent
 * Body: { whatsappId: string, consent: boolean }
 */
export async function updateConsent(req, res) {
  try {
    const { vendorId } = req.params;
    const { whatsappId, consent } = req.body;

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

    const session = await recordConsent(vendorId, whatsappId, consent);

    // Fire-and-forget audit trail entry - never blocks the response.
    logActivity(
      vendorId,
      'Consent Recorded',
      `Consent set to ${consent} via WhatsApp opt-in flow`
    ).catch(() => {}); // logActivity already catches internally; belt-and-suspenders

    return res.status(200).json({
      success: true,
      message: 'Consent recorded',
      data: {
        Vendor_ID: vendorId,
        SessionStatus: session.SessionStatus,
        Consent: session.Consent,
        ConsentTimestamp: session.ConsentTimestamp,
      },
    });
  } catch (err) {
    console.error('[vendorSessionController.updateConsent]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * GET /api/vendors/:vendorId/session
 */
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
