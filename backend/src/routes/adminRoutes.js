import express from 'express';
import { verifyToken, isEmployee, isAdmin } from '../middlewares/authMiddleware.js';
import adminController from '../controllers/adminController.js';
import { OrderController } from '../controllers/orderController.js';

const router = express.Router();

// Admin + Employee Routes
router.get('/dashboard', verifyToken, isEmployee, adminController.getDashboardSummary);
router.get('/orders', verifyToken, isEmployee, adminController.getAdminOrders);
router.patch('/orders/:id/status', verifyToken, isEmployee, OrderController.updateOrderStatus);
router.get('/products/low-stock', verifyToken, isEmployee, adminController.getLowStockProducts);

// Admin-only: User Management
router.get('/users', verifyToken, isAdmin, adminController.getAllUsers);
router.post('/users', verifyToken, isAdmin, adminController.createUser);
router.put('/users/:id', verifyToken, isAdmin, adminController.updateUser);
router.delete('/users/:id', verifyToken, isAdmin, adminController.deleteUser);
router.patch('/users/:id/status', verifyToken, isAdmin, adminController.updateUserStatus);

// Admin-only: Delivery Assignment
router.get('/employees', verifyToken, isAdmin, adminController.getEmployeesList);
router.get('/vehicles', verifyToken, isAdmin, adminController.getVehiclesList);
router.post('/deliveries', verifyToken, isAdmin, adminController.assignDelivery);
router.put('/deliveries/:id', verifyToken, isAdmin, adminController.reassignDelivery);
router.get('/deliveries/:id/location', verifyToken, isEmployee, adminController.getDeliveryLocation);

export default router;