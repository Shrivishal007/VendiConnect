import { generatePilotReport } from '../services/pilotAnalytics.js';

export async function getPilotReport(req, res) {
  try {
    const windowDays = req.query.windowDays ? parseInt(req.query.windowDays, 10) : undefined;

    if (windowDays !== undefined && (!Number.isFinite(windowDays) || windowDays <= 0)) {
      return res.status(400).json({ success: false, message: 'windowDays must be a positive number' });
    }

    const report = await generatePilotReport({ windowDays });

    return res.status(200).json({ success: true, data: report });
  } catch (err) {
    console.error('[pilotController.getPilotReport]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
