/**
 * app.js
 * -----------------------------------------------------------------------
 * Application entry point: wires up Express, connects to MongoDB Atlas,
 * and mounts the REST API Gateway routes.
 *
 * Scope reminder: this backend owns business logic, DB, and the REST
 * API. Frontend (React Native) and WhatsApp Cloud API webhook parsing
 * live in separate services/repos owned by other team members - they
 * call INTO this API (e.g. POST /api/vendors/:vendorId/location) once
 * they've already parsed their respective payloads.
 * -----------------------------------------------------------------------
 */

import 'dotenv/config';
import express from 'express';
import connectDB from './config/db.js';

import residentRoutes from './routes/residentRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';

import whatsappRoutes from './routes/whatsappRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import cors from 'cors';





const app = express();

// --- Middleware -----------------------------------------------------
app.use(express.json());

// --- DB Connection ----------------------------------------------------
connectDB();

// --- Health check (useful for Render/Railway free-tier uptime pings,
//     which also helps mitigate cold-start sleep on free instances) ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});


// Add this BEFORE your routes:
app.use(cors());
// --- Routes -------------------------------------------------------
app.use('/api/vendors', vendorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/residents', residentRoutes);

// Admin authentication endpoint (JWT token generation)
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@vendiconnect.in' && password === 'admin123') {
    return res.status(200).json({
      success: true,
      token: 'jwt-admin-vendiconnect-2026-auth-token',
      data: {
        email: 'admin@vendiconnect.in',
        name: 'Municipal Operations Lead',
        role: 'SUPER_ADMIN'
      }
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
});

// --- 404 fallback ---------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// --- Centralized error handler --------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] VendiConnect backend listening on port ${PORT} (0.0.0.0)`);
});

export default app;
