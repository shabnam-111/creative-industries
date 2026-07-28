// src/controllers/productController.js
import { ProductService } from '../services/productService.js';

export class ProductController {
  /**
   * GET /api/products - Get products with optional filter query parameters.
   */
  static async getAllProducts(req, res) {
    try {
      const { search, minPrice, maxPrice, material, compatibility } = req.query;

      const products = await ProductService.getAllProducts({
        search,
        minPrice,
        maxPrice,
        material,
        compatibility
      });

      res.json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (error) {
      console.error('Fetch Products Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve products list from database',
        error: error.message
      });
    }
  }

  /**
   * GET /api/products/:id - Get detailed information of a single product.
   */
  static async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await ProductService.getProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID '${id}' not found`
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Fetch Product Details Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve product details',
        error: error.message
      });
    }
  }

  /**
   * POST /api/products - Create a new catalog product (Admin only).
   */
  static async createProduct(req, res) {
    try {
      const {
        id,
        name,
        sku,
        price,
        stock,
        minOrderQty,
        min_order_qty,
        material,
        thickness,
        compatibility,
        imageUrl,
        image_url,
        specs
      } = req.body;

      // 1. Validation checks
      if (!name || name.trim() === '') {
        return res.status(400).json({ success: false, message: 'Product name is a required field' });
      }
      if (!sku || sku.trim() === '') {
        return res.status(400).json({ success: false, message: 'Product SKU is a required field' });
      }
      if (price === undefined || isNaN(Number(price))) {
        return res.status(400).json({ success: false, message: 'Valid product price is a required field' });
      }

      // Generate slug ID if none is supplied
      const productId = (id && id.trim() !== '')
        ? id.trim().toLowerCase()
        : name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const finalPrice = Number(price);
      if (finalPrice < 0) {
        return res.status(400).json({ success: false, message: 'Price cannot be negative' });
      }

      // Normalise properties to DB schema naming convention
      const newProduct = {
        id: productId,
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        price: finalPrice,
        stock: Number(stock) || 0,
        min_order_qty: Number(minOrderQty !== undefined ? minOrderQty : (min_order_qty || 1)),
        material: material ? material.trim() : null,
        thickness: thickness ? thickness.trim() : null,
        compatibility: Array.isArray(compatibility) ? compatibility : [],
        image_url: imageUrl || image_url || null,
        specs: specs && typeof specs === 'object' ? specs : {}
      };

      const product = await ProductService.createProduct(newProduct);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      console.error('Create Product Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create product in database',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/products/:id - Update an existing product (Admin only).
   */
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Ensure the product exists first
      const existingProduct = await ProductService.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: `Cannot update. Product with ID '${id}' not found`
        });
      }

      // Map parameters correctly if passed
      const mappedUpdates = {};
      if (updates.name !== undefined) mappedUpdates.name = updates.name.trim();
      if (updates.sku !== undefined) mappedUpdates.sku = updates.sku.trim().toUpperCase();
      if (updates.price !== undefined) {
        const p = Number(updates.price);
        if (isNaN(p) || p < 0) {
          return res.status(400).json({ success: false, message: 'Price must be a valid non-negative number' });
        }
        mappedUpdates.price = p;
      }
      if (updates.stock !== undefined) mappedUpdates.stock = Number(updates.stock) || 0;
      if (updates.minOrderQty !== undefined || updates.min_order_qty !== undefined) {
        const mq = Number(updates.minOrderQty !== undefined ? updates.minOrderQty : updates.min_order_qty);
        if (isNaN(mq) || mq < 1) {
          return res.status(400).json({ success: false, message: 'Minimum order quantity must be at least 1' });
        }
        mappedUpdates.min_order_qty = mq;
      }
      if (updates.material !== undefined) mappedUpdates.material = updates.material;
      if (updates.thickness !== undefined) mappedUpdates.thickness = updates.thickness;
      if (updates.compatibility !== undefined) {
        mappedUpdates.compatibility = Array.isArray(updates.compatibility) ? updates.compatibility : [];
      }
      if (updates.imageUrl !== undefined || updates.image_url !== undefined) {
        mappedUpdates.image_url = updates.imageUrl || updates.image_url;
      }
      if (updates.specs !== undefined && typeof updates.specs === 'object') {
        mappedUpdates.specs = updates.specs;
      }

      const product = await ProductService.updateProduct(id, mappedUpdates);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error) {
      console.error('Update Product Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product details',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/products/:id - Delete a product (Admin only).
   */
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      // Ensure product exists
      const existingProduct = await ProductService.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: `Cannot delete. Product with ID '${id}' not found`
        });
      }

      const product = await ProductService.deleteProduct(id);

      res.json({
        success: true,
        message: 'Product deleted successfully',
        data: product
      });
    } catch (error) {
      console.error('Delete Product Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product from database',
        error: error.message
      });
    }
  }
}
