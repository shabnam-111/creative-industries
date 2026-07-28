// src/services/productService.js
import { supabase } from '../config/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  return url && url !== 'YOUR_SUPABASE_PROJECT_URL' && !url.includes('placeholder') &&
         key && key !== 'YOUR_SUPABASE_ANON_KEY' && !key.includes('placeholder');
};

// Helper to get products from local data.js
const getLocalProducts = () => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dataFilePath = path.resolve(__dirname, '../../../data.js');
    
    if (fs.existsSync(dataFilePath)) {
      const fileContent = fs.readFileSync(dataFilePath, 'utf8');
      const mockWindow = {};
      const evalCode = fileContent;
      const fn = new Function('window', evalCode);
      fn.call(mockWindow, mockWindow);
      if (mockWindow.CreativeData && mockWindow.CreativeData.products) {
        // Map to match the backend products structure
        return mockWindow.CreativeData.products.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: Number(p.price) || 0,
          stock: Object.values(p.stockByWarehouse || {}).reduce((sum, qty) => sum + Number(qty), 0),
          min_order_qty: Number(p.minOrder) || 1,
          material: p.material,
          thickness: p.thickness,
          compatibility: p.compatibility || [],
          image_url: p.image,
          specs: {
            grade: p.grade,
            weight: p.weight,
            dimensions: p.dimensions,
            delivery_time: p.deliveryTime,
            description: p.description
          }
        }));
      }
    }
  } catch (err) {
    console.error('Error loading fallback products:', err.message);
  }
  return [];
};

export class ProductService {
  /**
   * Fetches all products matching the specified filters.
   * @param {object} filters - Filtering criteria (search, minPrice, maxPrice, material, compatibility)
   * @returns {Promise<array>} Array of product records.
   */
  static async getAllProducts(filters = {}) {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase is not configured. Serving products from data.js local fallback.');
      let products = getLocalProducts();
      
      // Apply filters locally
      if (filters.search) {
        const search = filters.search.toLowerCase().trim();
        products = products.filter(p => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search));
      }
      if (filters.minPrice !== undefined && filters.minPrice !== '') {
        const min = Number(filters.minPrice);
        if (!isNaN(min)) {
          products = products.filter(p => p.price >= min);
        }
      }
      if (filters.maxPrice !== undefined && filters.maxPrice !== '') {
        const max = Number(filters.maxPrice);
        if (!isNaN(max)) {
          products = products.filter(p => p.price <= max);
        }
      }
      if (filters.material) {
        products = products.filter(p => p.material && p.material.toLowerCase() === filters.material.toLowerCase().trim());
      }
      if (filters.compatibility) {
        const comp = filters.compatibility.toLowerCase().trim();
        products = products.filter(p => p.compatibility && p.compatibility.some(c => c.toLowerCase().includes(comp)));
      }
      return products;
    }

    let query = supabase.from('products').select('*');

    // 1. Text Search (matches name or SKU case-insensitively)
    if (filters.search) {
      const escapedSearch = filters.search.trim();
      query = query.or(`name.ilike.%${escapedSearch}%,sku.ilike.%${escapedSearch}%`);
    }

    // 2. Minimum Price filter
    if (filters.minPrice !== undefined && filters.minPrice !== '') {
      const min = Number(filters.minPrice);
      if (!isNaN(min)) {
        query = query.gte('price', min);
      }
    }

    // 3. Maximum Price filter
    if (filters.maxPrice !== undefined && filters.maxPrice !== '') {
      const max = Number(filters.maxPrice);
      if (!isNaN(max)) {
        query = query.lte('price', max);
      }
    }

    // 4. Material filter
    if (filters.material) {
      query = query.eq('material', filters.material.trim());
    }

    // 5. Vehicle Compatibility check (JSONB array containment check)
    if (filters.compatibility) {
      const compValue = filters.compatibility.trim();
      query = query.contains('compatibility', JSON.stringify([compValue]));
    }

    // Sort alphabetically by name
    query = query.order('name', { ascending: true });

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Fetches details for a single product by its ID.
   * @param {string} id - The product ID (string slug).
   * @returns {Promise<object|null>} The product record or null if not found.
   */
  static async getProductById(id) {
    if (!isSupabaseConfigured()) {
      const products = getLocalProducts();
      return products.find(p => p.id === id) || null;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Inserts a new product into the database.
   * @param {object} productData - New product details.
   * @returns {Promise<object>} The created product record.
   */
  static async createProduct(productData) {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Updates an existing product.
   * @param {string} id - The ID of the product to update.
   * @param {object} productData - Fields to update.
   * @returns {Promise<object>} The updated product record.
   */
  static async updateProduct(id, productData) {
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Deletes a product from the database.
   * @param {string} id - The ID of the product to delete.
   * @returns {Promise<object>} The deleted product record.
   */
  static async deleteProduct(id) {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  }
}
