// src/controllers/wishlistController.js
import { supabase } from '../config/supabase.js';

export class WishlistController {
  /**
   * GET /api/wishlist - Get all wishlist items for the authenticated user.
   */
  static async getWishlist(req, res) {
    try {
      const userId = req.user.id;

      const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
          id,
          product_id,
          products (
            id,
            name,
            sku,
            price,
            image_url,
            stock,
            material,
            thickness
          )
        `)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        count: data.length,
        data
      });
    } catch (error) {
      console.error('Get Wishlist Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve wishlist items from database',
        error: error.message
      });
    }
  }

  /**
   * POST /api/wishlist/add - Add an item to the user's wishlist.
   * Prevents duplicates by handling unique constraints gracefully.
   */
  static async addToWishlist(req, res) {
    try {
      const userId = req.user.id;
      const { productId, product_id } = req.body;
      const targetProductId = productId || product_id;

      if (!targetProductId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is a required field'
        });
      }

      // Check if product exists in catalog
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('id', targetProductId)
        .maybeSingle();

      if (productError) throw productError;
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID '${targetProductId}' does not exist`
        });
      }

      // Check if product is already in user's wishlist
      const { data: existingItem, error: checkError } = await supabase
        .from('wishlist_items')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', targetProductId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingItem) {
        return res.status(200).json({
          success: true,
          message: 'Product is already in your wishlist',
          data: existingItem
        });
      }

      // Insert new wishlist item
      const { data: result, error: insertError } = await supabase
        .from('wishlist_items')
        .insert([
          {
            user_id: userId,
            product_id: targetProductId
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      res.status(201).json({
        success: true,
        message: 'Product added to wishlist successfully',
        data: result
      });
    } catch (error) {
      console.error('Add to Wishlist Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add item to wishlist',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/wishlist/:productId - Remove a product item from the user's wishlist.
   */
  static async removeFromWishlist(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      const { data, error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId)
        .select();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found in your wishlist'
        });
      }

      res.json({
        success: true,
        message: 'Product removed from wishlist successfully',
        data: data[0]
      });
    } catch (error) {
      console.error('Remove from Wishlist Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove item from wishlist',
        error: error.message
      });
    }
  }
}
