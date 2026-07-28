import express from 'express';
import { verifyToken, isEmployee } from '../middlewares/authMiddleware.js';
import employeeController from '../controllers/employeeController.js';

const router = express.Router();

router.get('/deliveries', verifyToken, isEmployee, employeeController.getAssignedDeliveries);
router.patch('/deliveries/:id/status', verifyToken, isEmployee, employeeController.updateDeliveryStatus);
router.post('/deliveries/:id/location', verifyToken, isEmployee, employeeController.logDeliveryLocation);
router.post('/deliveries/:id/send-otp', verifyToken, isEmployee, employeeController.sendDeliveryOtp);

export default router;