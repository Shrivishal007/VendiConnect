import 'dotenv/config';
import express from 'express';
import connectDB from './config/db.js';
import corsMiddleware from './middleware/cors.js';
import { publicRateLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/ErrorHandler.js';
import adminRoutes from './routes/adminRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import ratingsRoutes from './routes/ratingsRoutes.js';
import residentRoutes from './routes/residentRoutes.js';
import healthRoutes from './routes/health.js';

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '100kb' }));

// Connect to MongoDB
await connectDB();

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/public', publicRateLimiter, categoryRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/residents', residentRoutes);
app.use('/health', healthRoutes);

// Root ping
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Vendiconnect Backend is running' });
});

app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`[SERVER] Backend is listening on port ${port}`));
