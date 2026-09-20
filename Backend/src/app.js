import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import corsMiddleware from './middleware/cors.js';

dotenv.config();

const app = express();

app.use(corsMiddleware);
app.use(express.json());

await connectDB();

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Vendiconnect Backend is running' });
});

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`[SERVER] Backend is listening on port ${port}`));
