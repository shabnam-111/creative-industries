// src/routes/productRoutes.js
import { Router } from 'express';
import { ProductController } from '../controllers/productController.js';
import { verifyToken, isAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/products - Get all products matching optional filter criteria (Public)
router.get('/', ProductController.getAllProducts);

// GET /api/products/:id - Get details for a single product (Public)
router.get('/:id', ProductController.getProductById);

// POST /api/products - Insert a new catalog product (Protected: Admin only)
router.post('/', verifyToken, isAdmin, ProductController.createProduct);

// PUT /api/products/:id - Update product details (Protected: Admin only)
router.put('/:id', verifyToken, isAdmin, ProductController.updateProduct);

// DELETE /api/products/:id - Delete a product (Protected: Admin only)
router.delete('/:id', verifyToken, isAdmin, ProductController.deleteProduct);

export default router;
