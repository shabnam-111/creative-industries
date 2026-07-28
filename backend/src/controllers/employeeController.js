import { supabase } from '../config/supabase.js';

const employeeController = {
  async _getEmployeeId(userId) {
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (error || !data) throw new Error('No employee record found for this user.');
    return data.id;
  },

  async getAssignedDeliveries(req, res) {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          orders(order_number, users(email, phone, customers(company_name, shipping_address))),
          vehicles(vehicle_number)
        `)
        .eq('employee_id', req.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      console.error('Get Assigned Deliveries Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateDeliveryStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, delayReason, vehicleIssue, remarks } = req.body;

      const validStatuses = [
        'assigned', 'accepted', 'started', 'arrived_pickup', 'picked_up',
        'in_transit', 'arrived_destination', 'delivered', 'failed', 'cancelled'
      ];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status: '${status}'` });
      }

      const updateData = { status };
      if (status === 'started') updateData.started_at = new Date().toISOString();
      if (['delivered', 'failed', 'cancelled'].includes(status)) {
        updateData.completed_at = new Date().toISOString();
      }
      if (delayReason !== undefined) updateData.delay_reason = delayReason;
      if (vehicleIssue !== undefined) updateData.vehicle_issue = vehicleIssue;
      if (remarks !== undefined) updateData.remarks = remarks;

      const { data, error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: `Delivery '${id}' not found` });

      // Sync the corresponding order status
      if (['delivered', 'failed', 'cancelled'].includes(status)) {
        await supabase.from('orders').update({ status }).eq('id', data.order_id);
      } else if (status === 'in_transit') {
        await supabase.from('orders').update({ status: 'dispatched' }).eq('id', data.order_id);
      }

      res.json({ success: true, message: `Delivery updated to ${status}`, data });
    } catch (error) {
      console.error('Update Delivery Status Error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async logDeliveryLocation(req, res) {
    try {
      const { id } = req.params; // delivery_id
      const { latitude, longitude, speed, heading } = req.body;

      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ success: false, message: "latitude and longitude are required" });
      }

      const employeeId = await employeeController._getEmployeeId(req.user.id);

      const { data, error } = await supabase
        .from('employee_gps_logs')
        .insert([{
          employee_id: employeeId,
          delivery_id: id,
          latitude,
          longitude,
          speed: speed ?? null,
          heading: heading ?? null,
          timestamp: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      console.error('Log Delivery Location Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

export default employeeController;