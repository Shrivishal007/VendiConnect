import mongoose from 'mongoose';
import { SLA_TARGETS } from '../config/slaTargets.js';

// Map MongoDB connection states to readable labels
const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

// Convert bytes to megabytes for health reporting
function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Collect database, performance, and application health metrics
export async function getHealthStatus() {
  const dbReadyState = mongoose.connection.readyState;
  const dbConnected = dbReadyState === 1;

  let dbPingMs = null;
  let dbPingSucceeded = false;

  // Measure database responsiveness with an admin ping
  if (dbConnected && mongoose.connection.db) {
    try {
      const start = Date.now();

      await mongoose.connection.db.admin().ping();

      dbPingMs = Date.now() - start;
      dbPingSucceeded = true;
    } catch (err) {
      console.error('[health] DB ping failed:', err.message);
    }
  }

  const dbHealthy = dbConnected && dbPingSucceeded;
  const memoryUsage = process.memoryUsage();

  // Retrieve the configured database ping latency target
  const dbPingTargetMs = SLA_TARGETS.DB_PING_LATENCY_MS ?? null;

  return {
    success: dbHealthy,
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),

    database: {
      connected: dbConnected,
      pingSucceeded: dbPingSucceeded,
      state: READY_STATE_LABELS[dbReadyState] ?? 'unknown',
      pingMs: dbPingMs,
      withinSlaTarget:
        dbPingMs === null || dbPingTargetMs === null
          ? null
          : dbPingMs <= dbPingTargetMs,
    },

    slaTargets: SLA_TARGETS,

    // Report process memory consumption
    memory: {
      rss: formatBytes(memoryUsage.rss),
      heapUsed: formatBytes(memoryUsage.heapUsed),
      heapTotal: formatBytes(memoryUsage.heapTotal),
    },

    env: process.env.NODE_ENV || 'development',
  };
}