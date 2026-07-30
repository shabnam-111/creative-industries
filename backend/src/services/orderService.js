// src/services/orderService.js
import { supabase } from '../config/supabase.js';
import { EmailService } from './emailService.js';

export class OrderService {
  /**
   * Places a new order by converting the user's cart items into a final order.
   * Performs validation against catalog stocks and minimum order requirements.
   * Decrements stock and empties user's cart.
   * @param {string} userId - ID of the client placing the order.
   * @param {string} userEmail - Email of the client placing the order.
   * @param {object} details - Extra order details (vehicle_number, remarks).
   */
  static async placeOrder(userId, userEmail, details = {}) {
    // 1. Fetch user's current cart items
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        product_id,
        products (
          id,
          name,
          sku,
          price,
          stock,
          min_order_qty
        )
      `)
      .eq('user_id', userId);

    if (cartError) throw cartError;

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Your cart is empty. Add products to your cart before checking out.');
    }

    const itemsSnapshot = [];
    let subtotal = 0;

    // 2. Validate quantities and stock availability for each item
    for (const item of cartItems) {
      const product = item.products;
      if (!product) {
        throw new Error(`Product reference was not found for item with ID: ${item.product_id}`);
      }

      // Check min quantity requirement
      if (item.quantity < product.min_order_qty) {
        throw new Error(`Order item "${product.name}" quantity (${item.quantity}) is less than the minimum order requirement (${product.min_order_qty}).`);
      }

      // Check stock availability
      if (item.quantity > product.stock) {
        throw new Error(`Insufficient stock for "${product.name}". Requested: ${item.quantity}, Available: ${product.stock}`);
      }

      subtotal += Number(product.price) * item.quantity;
      itemsSnapshot.push({
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        price: Number(product.price)
      });
    }

    // 3. Compute costs (B2B steel solutions standard GST = 18%, standard logistics rate = 4500)
    const gstRate = 0.18;
    const gstAmount = subtotal * gstRate;
    const shipping = subtotal > 100000 ? 0 : 4500; // Free shipping on B2B orders above 1 Lakh
    const totalAmount = subtotal + gstAmount + shipping;

    const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = {
      order_number: orderNumber,
      user_id: userId,
      status: 'pending',
      total_amount: Math.round(totalAmount * 100) / 100,
      items: itemsSnapshot,
      vehicle_number: details.vehicleNumber || details.vehicle_number || null,
      remarks: details.remarks || null
    };

    // 4. Create order record
    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert([newOrder])
      .select()
      .single();

    if (orderError) throw orderError;

    // 5. Update stock values for each product
    for (const item of cartItems) {
      const product = item.products;
      const updatedStock = product.stock - item.quantity;
      const { error: stockUpdateError } = await supabase
        .from('products')
        .update({ stock: updatedStock })
        .eq('id', product.id);

      if (stockUpdateError) {
        console.error(`⚠️ Failed to decrement stock for product ${product.id}:`, stockUpdateError.message);
      }
    }

    // 6. Clear user's cart
    const { error: clearCartError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (clearCartError) {
      console.error('⚠️ Failed to empty cart after order creation:', clearCartError.message);
    }

    // 7. Dispatch transaction email in background
    EmailService.sendOrderPlacedEmail(userEmail, createdOrder);

    return createdOrder;
  }

  /**
   * Fetches all orders belonging to a specific client user.
   */
  static async getUserOrders(userId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, deliveries(status, expected_delivery_time, users(full_name), vehicles(vehicle_number))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Retrieves specific order details by ID.
   */
  static async getOrderById(orderId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Fetches all B2B orders in the system (Admin / Employee access).
   */
  static async getAdminOrders() {
    // Select orders and join user email & company name
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        users (
          email,
          company_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Updates an order status, logs the change in history, and notifies the client via email.
   */
  static async updateOrderStatus(orderId, updates = {}) {
    const { status, vehicleNumber, remarks } = updates;

    // 1. Fetch current order details
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, users(email)')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!order) {
      throw new Error(`Order with ID '${orderId}' not found.`);
    }

    const updateData = {};
    if (status) {
      const formattedStatus = status.toLowerCase();
      const validStatuses = [
        'pending', 'accepted', 'rejected', 'dispatched', 'delivered',
        'started', 'arrived_pickup', 'picked_up', 'in_transit',
        'arrived_destination', 'failed', 'cancelled', 'processing', 'approved'
      ];
      if (!validStatuses.includes(formattedStatus)) {
        throw new Error(`Invalid status option: '${status}'.`);
      }

      if (['dispatched', 'delivered'].includes(formattedStatus)) {
        const { data: del, error: delErr } = await supabase.from('deliveries').select('id').eq('order_id', orderId).maybeSingle();
        if (delErr) throw delErr;
        if (del) {
          const mappedStatus = formattedStatus === 'dispatched' ? 'in_transit' : 'delivered';
          const { error: updErr } = await supabase.from('deliveries').update({ status: mappedStatus }).eq('id', del.id);
          if (updErr) throw updErr;
        }
      } else if (['accepted', 'pending', 'rejected', 'processing'].includes(formattedStatus)) {
        const { data: del, error: delErr } = await supabase.from('deliveries').select('id').eq('order_id', orderId).not('status', 'in', '(delivered,failed,cancelled)').maybeSingle();
        if (delErr) throw delErr;
        if (del) {
          const { error: updErr } = await supabase.from('deliveries').update({ status: 'cancelled' }).eq('id', del.id);
          if (updErr) throw updErr;
        }
      }
      updateData.status = formattedStatus;
    }
    if (vehicleNumber !== undefined) updateData.vehicle_number = vehicleNumber;
    if (remarks !== undefined) updateData.remarks = remarks;

    // 3. Update orders table
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Restore stock if the order was just cancelled
    if (updateData.status === 'cancelled' && order.status.toLowerCase() !== 'cancelled') {
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (!itemsError && orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          const { data: product } = await supabase
            .from('products')
            .select('id, stock')
            .eq('id', item.product_id)
            .single();

          if (product) {
            await supabase
              .from('products')
              .update({ stock: product.stock + item.quantity })
              .eq('id', product.id);
          }
        }
      }
    }

    if (updateError) throw updateError;

    // 4. Send email notification to user
    const recipientEmail = order.users?.email;
    if (recipientEmail && status && order.status.toLowerCase() !== status.toLowerCase()) {
      EmailService.sendOrderStatusUpdatedEmail(recipientEmail, updatedOrder);
    }

    return updatedOrder;
  }

  /**
   * Cancels an order by client if it hasn't been dispatched yet.
   */
  static async cancelOrder(userId, orderId) {
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, users(email)')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!order) {
      throw new Error(`Order not found.`);
    }

    if (order.user_id !== userId) {
      throw new Error(`You do not have permission to cancel this order.`);
    }

    const uncancelableStatuses = ['dispatched', 'in_transit', 'arrived_destination', 'delivered', 'cancelled', 'failed'];
    if (uncancelableStatuses.includes(order.status.toLowerCase())) {
      throw new Error(`Order cannot be cancelled because it is already ${order.status}.`);
    }

    // Cancel any pending deliveries
    const { data: del, error: delErr } = await supabase
      .from('deliveries')
      .select('id')
      .eq('order_id', orderId)
      .not('status', 'in', '(delivered,failed,cancelled)')
      .maybeSingle();
      
    if (delErr) throw delErr;
    if (del) {
      const { error: updErr } = await supabase.from('deliveries').update({ status: 'cancelled' }).eq('id', del.id);
      if (updErr) throw updErr;
    }

    // Update order status to cancelled
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    // Restore stock
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        const { data: product, error: prodError } = await supabase
          .from('products')
          .select('id, stock')
          .eq('id', item.product_id)
          .single();
          
        if (product && !prodError) {
          await supabase
            .from('products')
            .update({ stock: product.stock + item.quantity })
            .eq('id', product.id);
        }
      }
    }

    // Optionally notify
    const recipientEmail = order.users?.email;
    if (recipientEmail) {
      EmailService.sendOrderStatusUpdatedEmail(recipientEmail, updatedOrder);
    }

    return updatedOrder;
  }

  /**
   * Get the GPS history for a specific delivery.
   */
  static async getDeliveryLocation(deliveryId) {
    const { data, error } = await supabase
      .from('employee_gps_logs')
      .select('latitude, longitude, speed, timestamp')
      .eq('delivery_id', deliveryId)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    return data;
  }
}