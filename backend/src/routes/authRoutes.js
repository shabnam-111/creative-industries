import express from 'express';
import {
    register,
    login,
    getMe,
    sendRegisterOtp,
    sendForgotPasswordOtp,
    resetPassword
} from '../controllers/authController.js';

import {
    verifyToken
} from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send-register-otp', sendRegisterOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', sendForgotPasswordOtp);
router.post('/reset-password', resetPassword);
router.get('/me', verifyToken, getMe);

export default router;