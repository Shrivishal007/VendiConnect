import 'dotenv/config';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import connectDB from './config/db.js';
import corsMiddleware from './middleware/cors.js';
import { publicRateLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/ErrorHandler.js';
import adminRoutes from './routes/adminRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import ratingsRoutes from './routes/ratingsRoutes.js';
import residentRoutes from './routes/residentRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

const app = express();

// Apply global middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '100kb' }));

// Connect to MongoDB before starting the server
await connectDB();

// Register API routes
app.use('/api/admin', adminRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/public', publicRateLimiter, categoryRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/health', healthRoutes);

// Root endpoint for basic server status
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Vendiconnect Backend is running' });
});

// Resolve the directory containing this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the OpenAPI specification and Swagger UI documentation
app.use('/openapi.yaml', express.static(path.resolve(__dirname, '../openapi.yaml')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, { swaggerOptions: { url: '/openapi.yaml' } }));

// Handle unmatched routes and application errors
app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT || 5000;

// Start the server
app.listen(port, () => console.log(`[SERVER] Backend is listening on port ${port}`));
