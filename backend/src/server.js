// src/server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import profileRouter from './routes/profile.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend integration
app.use(cors());

// Log incoming HTTP requests
app.use(morgan('dev'));

// Parse JSON request bodies
app.use(express.json());

// Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/profile', profileRouter);

// Health/Status check endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'Creative Industries B2B Backend is running successfully',
    timestamp: new Date()
  });
});

// Root fallback route
app.get('/', (req, res) => {
  res.send('Welcome to Creative Industries B2B Backend API. Use /api/status or /api/products, etc.');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred',
    error: err.message
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
