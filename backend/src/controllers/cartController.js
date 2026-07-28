import { supabase } from '../config/supabase.js';

const cartController = {
  async addToCart(req, res) {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    const { error } = await supabase
      .from('cart_items')
      .upsert([{ user_id: userId, product_id: productId, quantity: quantity || 1 }], { onConflict: 'user_id,product_id' });

    if (error) return res.status(500).json({ success: false, message: error.message });

    res.json({ success: true, message: 'Added to cart' });
  },

  async getCart(req, res) {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', userId);

    if (error) return res.status(500).json({ success: false, message: error.message });

    res.json({ success: true, data });
  },

  async removeFromCart(req, res) {
    const userId = req.user.id;
    const { productId } = req.params;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) return res.status(500).json({ success: false, message: error.message });

    res.json({ success: true, message: 'Removed from cart' });
  }
};

export default cartController;
