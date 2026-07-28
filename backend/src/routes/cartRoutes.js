import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import cartController from '../controllers/cartController.js';

const router = express.Router();

router.post('/add', protect, cartController.addToCart);
router.get('/', protect, cartController.getCart);
router.delete('/:productId', protect, cartController.removeFromCart);

export default router;
