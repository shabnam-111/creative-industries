import express from 'express';
import { verifyToken, isEmployee } from '../middlewares/authMiddleware.js';
import employeeController from '../controllers/employeeController.js';

const router = express.Router();

router.get('/deliveries', verifyToken, isEmployee, employeeController.getAssignedDeliveries);
router.patch('/deliveries/:id/status', verifyToken, isEmployee, employeeController.updateDeliveryStatus);
router.post('/deliveries/:id/location', verifyToken, isEmployee, employeeController.logDeliveryLocation);

export default router;