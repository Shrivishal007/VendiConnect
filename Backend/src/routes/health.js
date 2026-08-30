import express from 'express';
import mongoose from 'mongoose';
import { SLA_TARGETS } from '../config/slaTargets.js';

const router = express.Router();

const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

router.get('/', async (req, res) => {
  const dbReadyState = mongoose.connection.readyState;
  const dbConnected = dbReadyState === 1;

  let dbPingMs = null;
  if (dbConnected) {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      dbPingMs = Date.now() - start;
    } catch (err) {
      console.error('[health] DB ping failed despite readyState=connected:', err.message);
    }
  }

  const memoryUsage = process.memoryUsage();

  const payload = {
    success: true,
    status: dbConnected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      connected: dbConnected,
      state: READY_STATE_LABELS[dbReadyState] || 'unknown',
      pingMs: dbPingMs,
      withinSlaTarget: dbPingMs === null ? null : dbPingMs <= SLA_TARGETS.GEOSPATIAL_QUERY_LATENCY_MS,
    },
    slaTargets: SLA_TARGETS,
    memory: {
      rss: formatBytes(memoryUsage.rss),
      heapUsed: formatBytes(memoryUsage.heapUsed),
      heapTotal: formatBytes(memoryUsage.heapTotal),
    },
    env: process.env.NODE_ENV || 'development',
  };

  return res.status(dbConnected ? 200 : 200).json(payload);
});

export default router;
