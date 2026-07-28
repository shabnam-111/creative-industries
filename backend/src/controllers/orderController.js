// src/controllers/orderController.js
import { OrderService } from '../services/orderService.js';

export class OrderController {
  /**
   * POST /api/orders - Checkout user's cart and place a new order.
   */
  static async placeOrder(req, res) {
    try {
      const userId = req.user.id;
      const userEmail = req.user.email;
      const { vehicleNumber, remarks } = req.body;

      const order = await OrderService.placeOrder(userId, userEmail, {
        vehicleNumber,
        remarks
      });

      res.status(201).json({
        success: true,
        message: 'Order placed successfully. A confirmation email has been sent.',
        data: order
      });
    } catch (error) {
      console.error('Place Order Controller Error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/orders - Fetch all orders belonging to the authenticated client.
   */
  static async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const orders = await OrderService.getUserOrders(userId);

      res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      console.error('Get User Orders Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve order history',
        error: error.message
      });
    }
  }

  /**
   * GET /api/orders/:id - Retrieve tracking details for a specific order.
   * Restricts reading to the order owner, employees, or admins.
   */
  static async getOrderById(req, res) {
    try {
      const { id } = req.params;
      const order = await OrderService.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: `Order with ID '${id}' not found`
        });
      }

      // Check access permission: client user must own the order
      if (req.user.role === 'client' && order.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to view this order.'
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Get Order By ID Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve order tracking details',
        error: error.message
      });
    }
  }

  /**
   * GET /api/admin/orders - Retrieve all orders placed on the system (Admin/Employee only).
   */
  static async getAdminOrders(req, res) {
    try {
      const orders = await OrderService.getAdminOrders();

      res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      console.error('Get Admin Orders Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve administrative order log',
        error: error.message
      });
    }
  }

  /**
   * PATCH /api/admin/orders/:id/status - Update an order's status, remarks, and vehicle number (Admin/Employee only).
   */
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, vehicleNumber, remarks } = req.body;

      const order = await OrderService.updateOrderStatus(id, {
        status,
        vehicleNumber,
        remarks
      });

      res.json({
        success: true,
        message: `Order #${order.order_number} has been updated to ${order.status.toUpperCase()}.`,
        data: order
      });
    } catch (error) {
      console.error('Update Order Status Controller Error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}
