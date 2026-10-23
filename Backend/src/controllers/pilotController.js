import { generatePilotReport } from '../services/pilotAnalytics.js';

// Generate a pilot report for the specified time window
export async function getPilotReport(req, res) {
  try {
    const windowDays = req.query.windowDays ? parseInt(req.query.windowDays, 10) : undefined;

    // Validate the requested time window if provided
    if (windowDays !== undefined && (!Number.isFinite(windowDays) || windowDays <= 0)) {
      return res.status(400).json({ success: false, message: 'windowDays must be a positive number' });
    }

    const report = await generatePilotReport({ windowDays });

    return res.status(200).json({ success: true, data: report });
  } catch (err) {
    // Log unexpected errors and return a generic response
    console.error('[pilotController.getPilotReport]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
