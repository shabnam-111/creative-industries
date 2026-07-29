import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import paytmController from '../controllers/paytmController.js';

const router = express.Router();

// Route to initiate Paytm transaction
router.post('/initiate', verifyToken, paytmController.initiateTransaction);

// Webhook route for Paytm callback
router.post('/callback', paytmController.paymentCallback);

export default router;
