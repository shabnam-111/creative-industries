// src/routes/wishlistRoutes.js
import { Router } from 'express';
import { WishlistController } from '../controllers/wishlistController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/wishlist - Fetch user wishlist items (Protected)
router.get('/', verifyToken, WishlistController.getWishlist);

// POST /api/wishlist/add - Add product line-item to wishlist (Protected)
router.post('/add', verifyToken, WishlistController.addToWishlist);

// DELETE /api/wishlist/:productId - Delete product line-item from wishlist (Protected)
router.delete('/:productId', verifyToken, WishlistController.removeFromWishlist);

export default router;
