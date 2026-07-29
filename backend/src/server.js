// src/server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import profileRouter from './routes/profile.js';
import authRouter from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import paytmRoutes from './routes/paytmRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import employeeRouter from './routes/employeeRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend integration
app.use(cors());

// Log incoming HTTP requests
app.use(morgan('dev'));

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRouter);
app.use('/api/employee', employeeRouter);
app.use('/api/profile', profileRouter);
app.use('/api/auth', authRouter);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/paytm', paytmRoutes);

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

// Start listening (only if not running in Vercel serverless environment)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

export default app;
