import { supabase } from '../config/supabase.js';
import { AuthService } from '../services/authService.js';

const adminController = {
  async getDashboardSummary(req, res) {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from('orders').select('status, total_amount'),
        supabase.from('products').select('stock')
      ]);

      const orders = ordersRes.data || [];
      const products = productsRes.data || [];

      let totalRevenue = 0;
      const statusCount = { pending: 0, accepted: 0, rejected: 0, dispatched: 0, delivered: 0 };

      orders.forEach(order => {
        const status = order.status?.toLowerCase();
        if (statusCount[status] !== undefined) statusCount[status]++;
        if (status !== 'rejected') totalRevenue += Number(order.total_amount) || 0;
      });

      const lowStock = products.filter(p => p.stock <= 300).length;

      res.json({
        success: true,
        data: {
          totalRevenue: Math.round(totalRevenue),
          totalOrders: orders.length,
          statusCount,
          lowStockProducts: lowStock
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getAdminOrders(req, res) {
  const { status } = req.query;
  let query = supabase
    .from('orders')
    .select('*, users(email, customers(company_name, shipping_address)), deliveries(id, status, expected_delivery_time, employee_id, vehicle_id, pickup_location, destination, users(full_name), vehicles(vehicle_number))')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });

  res.json({ success: true, data });
},
  async getLowStockProducts(req, res) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .lte('stock', 10)
      .order('stock', { ascending: true });

    if (error) return res.status(500).json({ success: false, message: error.message });

    res.json({ success: true, data });
  },

  /**
   * GET /api/admin/users - Retrieve all customers and employees (Admin only).
   * Optional ?role=customer|employee filter.
   */
  async getAllUsers(req, res) {
    try {
      const { role } = req.query;

      let query = supabase
        .from('users')
        .select(`
          id, email, role, full_name, phone, status, created_at, last_login,
          customers(company_name, gst_number, address, shipping_address),
          employees(employee_id, assigned_territory, status)
        `)
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (role) query = query.eq('role', role);

      const { data, error } = await query;
      if (error) throw error;

      res.json({ success: true, count: data.length, data });
    } catch (error) {
      console.error('Get All Users Controller Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * PATCH /api/admin/users/:id/status - Activate or suspend a user account (Admin only).
   */
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'suspended', 'pending'].includes(status)) {
        return res.status(400).json({ success: false, message: "Status must be one of: active, suspended, pending" });
      }

      const { data, error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: `User with ID '${id}' not found` });

      res.json({ success: true, message: `User status updated to ${status}`, data });
    } catch (error) {
      console.error('Update User Status Controller Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async createUser(req, res) {
    try {
      const { email, password, full_name, role, company_name } = req.body;
      if (!email || !password || !full_name) {
        return res.status(400).json({ success: false, message: 'Email, password, and full name are required' });
      }
      
      const allowedRoles = ['customer', 'employee', 'admin', 'client'];
      const userRole = allowedRoles.includes(role) ? role : 'customer';

      const result = await AuthService.register({
        email,
        password,
        full_name,
        role: userRole,
        company_name: company_name || full_name
      });

      res.status(201).json({ success: true, message: 'User created successfully', data: result.user });
    } catch (error) {
      console.error('Create User Error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { full_name, email, role, company_name } = req.body;

      const { data: user, error: userError } = await supabase
        .from('users')
        .update({ full_name, email, role })
        .eq('id', id)
        .select()
        .single();

      if (userError) throw userError;
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      if (role === 'customer' || role === 'client') {
        const { data: existingCust } = await supabase.from('customers').select('id').eq('user_id', id).maybeSingle();
        if (existingCust) {
          if (company_name) {
            await supabase.from('customers').update({ company_name }).eq('user_id', id);
          }
        } else {
          await supabase.from('customers').insert([{ user_id: id, company_name: company_name || full_name }]);
        }
      }

      res.json({ success: true, message: 'User updated successfully', data: user });
    } catch (error) {
      console.error('Update User Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      if (req.user && req.user.id === id) {
        return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
      }

      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'User not found' });

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete User Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getEmployeesList(req, res) {
    try {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, user_id, employee_id, assigned_territory, status, users(full_name, email, phone)')
        .order('employee_id');
      if (error) throw error;

      const { data: activeDeliveries, error: delErr } = await supabase
        .from('deliveries')
        .select('employee_id')
        .not('status', 'in', '(delivered,failed,cancelled)');
      if (delErr) throw delErr;

      const busyIds = new Set((activeDeliveries || []).map(d => d.employee_id));
      const result = employees.map(e => ({ ...e, isBusy: busyIds.has(e.user_id) }));

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getVehiclesList(req, res) {
    try {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('*');
      if (error) throw error;

      const { data: activeDeliveries, error: delErr } = await supabase
        .from('deliveries')
        .select('vehicle_id')
        .not('status', 'in', '(delivered,failed,cancelled)')
        .not('vehicle_id', 'is', null);
      if (delErr) throw delErr;

      const busyVehicleIds = new Set(activeDeliveries.map(d => d.vehicle_id));
      const result = vehicles.map(v => ({ ...v, isBusy: busyVehicleIds.has(v.id) }));

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async assignDelivery(req, res) {
    try {
      const { order_id, employee_id, vehicle_id, pickup_location, destination, expected_delivery_time } = req.body;

      if (!order_id || !employee_id) {
        return res.status(400).json({ success: false, message: 'order_id and employee_id are required' });
      }

      // Enforce: employee cannot receive a new assignment while one is still active
      const { data: busyDelivery, error: busyErr } = await supabase
        .from('deliveries')
        .select('id')
        .eq('employee_id', employee_id)
        .not('status', 'in', '(delivered,failed,cancelled)')
        .maybeSingle();
      if (busyErr) throw busyErr;
      if (busyDelivery) {
        return res.status(400).json({
          success: false,
          message: 'This employee already has an active delivery. They must complete it before receiving a new assignment.'
        });
      }

      // Prevent double-assigning the same order
      const { data: existingForOrder, error: orderDelErr } = await supabase
        .from('deliveries')
        .select('id')
        .eq('order_id', order_id)
        .not('status', 'in', '(delivered,failed,cancelled)')
        .maybeSingle();
      if (orderDelErr) throw orderDelErr;
      if (existingForOrder) {
        return res.status(400).json({ success: false, message: 'This order already has an active delivery assigned.' });
      }

      const { data, error } = await supabase
        .from('deliveries')
        .insert([{
          order_id,
          employee_id,
          vehicle_id: vehicle_id || null,
          pickup_location: pickup_location || 'Faridabad Works',
          destination,
          expected_delivery_time: expected_delivery_time || null,
          status: 'pending'
        }])
        .select()
        .single();
      if (error) throw error;

      res.json({ success: true, message: 'Delivery assigned successfully', data });
    } catch (error) {
      console.error('Assign Delivery Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async reassignDelivery(req, res) {
    try {
      const { id } = req.params;
      const { employee_id, vehicle_id, pickup_location, destination, expected_delivery_time } = req.body;

      if (!employee_id) {
        return res.status(400).json({ success: false, message: 'employee_id is required' });
      }

      // Check if employee is currently busy
      const { data: busyDelivery, error: busyErr } = await supabase
        .from('deliveries')
        .select('id')
        .eq('employee_id', employee_id)
        .not('status', 'in', '(delivered,failed,cancelled)')
        .neq('id', id)
        .maybeSingle();
      if (busyErr) throw busyErr;
      if (busyDelivery) {
        return res.status(400).json({
          success: false,
          message: 'This employee already has an active delivery. They must complete it before receiving a new assignment.'
        });
      }

      const { data, error } = await supabase
        .from('deliveries')
        .update({
          employee_id,
          vehicle_id: vehicle_id || null,
          pickup_location: pickup_location || 'Faridabad Works',
          destination,
          expected_delivery_time: expected_delivery_time || null
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      res.json({ success: true, message: 'Delivery reassigned successfully', data });
    } catch (error) {
      console.error('Reassign Delivery Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

export default adminController;