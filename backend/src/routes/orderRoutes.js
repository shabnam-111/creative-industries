// src/routes/orderRoutes.js
import { Router } from 'express';
import { OrderController } from '../controllers/orderController.js';
import { verifyToken, isEmployee } from '../middlewares/authMiddleware.js';

const clientRouter = Router();

// ==========================================
// CLIENT ORDERS ROUTES (Mounted under /api/orders)
// ==========================================

// POST /api/orders - Place a new order from current cart (Protected)
clientRouter.post('/', verifyToken, OrderController.placeOrder);

// GET /api/orders - Retrieve order history list for client (Protected)
clientRouter.get('/', verifyToken, OrderController.getUserOrders);

// GET /api/orders/:id - Track details of a single order (Protected: Owner only)
clientRouter.get('/:id', verifyToken, OrderController.getOrderById);

// GET /api/orders/:id/delivery-location - Get live GPS of delivery
clientRouter.get('/:id/delivery-location', verifyToken, OrderController.getDeliveryLocation);

export default clientRouter;
