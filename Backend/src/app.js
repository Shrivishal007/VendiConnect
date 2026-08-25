/**
 * app.js
 * -----------------------------------------------------------------------
 * Application entry point: wires up Express, connects to MongoDB Atlas,
 * initializes Firebase Admin, and mounts all REST API Gateway routes.
 *
 * Scope reminder: this backend owns business logic, DB, and the REST
 * API. Frontend (React Native) and WhatsApp Cloud API webhook parsing
 * live in separate services owned by other team members - they call
 * INTO this API once they've already parsed their respective payloads.
 *
 * *** MODIFIED THIS WEEK ***
 * - Imports config/firebaseAdmin.js so the SDK initializes at boot.
 * - Mounts ratingRoutes and adminRoutes.
 * -----------------------------------------------------------------------
 */

import 'dotenv/config';
import express from 'express';
import connectDB from './config/db.js';
import './config/firebaseAdmin.js';

import vendorRoutes from './routes/vendorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import residentRoutes from './routes/residentRoutes.js';

const app = express();

// --- Middleware -----------------------------------------------------
app.use(express.json());

// --- DB Connection ----------------------------------------------------
connectDB();

// --- Health check -----------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Routes -------------------------------------------------------
app.use('/api/vendors', vendorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/residents', residentRoutes);

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

app.listen(PORT, () => {
  console.log(`[Server] VendiConnect backend listening on port ${PORT}`);
});

export default app;
