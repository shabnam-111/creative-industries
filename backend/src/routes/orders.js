// src/routes/orders.js
import { Router } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

// GET /api/orders - Get all orders
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders from database',
      error: error.message
    });
  }
});

// POST /api/orders - Create a new order
router.post('/', async (req, res) => {
  try {
    const {
      orderNumber,
      order_number,
      userId,
      user_id,
      status,
      totalAmount,
      total_amount,
      total,
      items,
      vehicleNumber,
      vehicle_number,
      remarks
    } = req.body;

    const ordNum = orderNumber || order_number || `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const finalTotal = Number(totalAmount !== undefined ? totalAmount : (total_amount !== undefined ? total_amount : (total || 0)));

    const newOrder = {
      order_number: ordNum,
      user_id: userId || user_id || null,
      status: (status || 'pending').toLowerCase(),
      total_amount: finalTotal,
      items: items || [],
      vehicle_number: vehicleNumber || vehicle_number || null,
      remarks: remarks || null
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([newOrder])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order in database',
      error: error.message
    });
  }
});

export default router;
