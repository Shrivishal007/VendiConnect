import { getHealthStatus } from '../services/healthService.js';

// Check backend health and return the appropriate HTTP status
export async function getHealth(req, res, next) {
  try {
    const health = await getHealthStatus();

    // Return 200 if healthy or 503 if the service is degraded
    return res.status(health.success ? 200 : 503).json(health);
  } catch (err) {
    // Forward unexpected errors to the centralized error handler
    next(err);
  }
}
