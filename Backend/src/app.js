import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import corsMiddleware from './middleware/cors.js';
import adminRoutes from './routes/adminRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import ratingsRoutes from './routes/ratingsRoutes.js';
import residentRoutes from './routes/residentRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Connect to MongoDB
await connectDB();

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/public', categoryRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/residents', residentRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Vendiconnect Backend is running' });
});

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`[SERVER] Backend is listening on port ${port}`));
