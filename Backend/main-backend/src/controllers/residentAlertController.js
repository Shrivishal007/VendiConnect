import {
  getResidentAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
} from '../services/alertService.js';

// Get in-app proximity alerts for the authenticated resident
export async function getMyAlerts(req, res) {
  try {
    const resident = req.resident;
    if (!resident) {
      return res.status(401).json({ success: false, message: 'Resident not authenticated' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const result = await getResidentAlerts(resident._id, { limit, skip });

    return res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      unreadCount: result.unreadCount,
      page,
      limit,
    });
  } catch (err) {
    console.error('[residentAlertController.getMyAlerts]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Mark a specific alert as read
export async function markAlertRead(req, res) {
  try {
    const resident = req.resident;
    const { alertId } = req.params;

    if (!resident) {
      return res.status(401).json({ success: false, message: 'Resident not authenticated' });
    }

    const updated = await markAlertAsRead(alertId, resident._id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Alert marked as read',
      data: { alertId, read: true },
    });
  } catch (err) {
    console.error('[residentAlertController.markAlertRead]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Mark all alerts as read for the authenticated resident
export async function markAllAlertsRead(req, res) {
  try {
    const resident = req.resident;
    if (!resident) {
      return res.status(401).json({ success: false, message: 'Resident not authenticated' });
    }

    await markAllAlertsAsRead(resident._id);

    return res.status(200).json({
      success: true,
      message: 'All alerts marked as read',
    });
  } catch (err) {
    console.error('[residentAlertController.markAllAlertsRead]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
