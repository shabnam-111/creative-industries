import { supabase } from '../config/supabase.js';
import { EmailService } from '../services/emailService.js';

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
        'pending', 'accepted', 'started', 'reached_pickup',
        'in_transit', 'reached_destination', 'delivered', 'delivery_failed', 'cancelled'
      ];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status: '${status}'` });
      }

      if (status === 'delivered') {
        const { otp } = req.body;
        if (!otp) return res.status(400).json({ success: false, message: "OTP is required to mark delivery as completed." });

        // First fetch the delivery to get the order_id
        const { data: currentDel, error: currentDelErr } = await supabase
          .from('deliveries')
          .select('order_id')
          .eq('id', id)
          .single();
        if (currentDelErr || !currentDel) return res.status(404).json({ success: false, message: "Delivery not found" });

        // Query the delivery_otps table for this order_id
        const { data: otpRecord, error: otpErr } = await supabase
          .from('delivery_otps')
          .select('*')
          .eq('order_id', currentDel.order_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (otpErr || !otpRecord) {
           return res.status(400).json({ success: false, message: "No OTP found for this delivery. Please send an OTP first." });
        }

        if (otpRecord.is_used) {
           return res.status(400).json({ success: false, message: "This OTP has already been used." });
        }

        if (new Date(otpRecord.expires_at) < new Date()) {
           return res.status(400).json({ success: false, message: "OTP has expired. Please send a new OTP." });
        }

        if (otpRecord.otp_code !== String(otp)) {
           return res.status(400).json({ success: false, message: "Invalid OTP code." });
        }

        // Mark OTP as used
        await supabase.from('delivery_otps').update({ is_used: true }).eq('id', otpRecord.id);
      }

      const updateData = { status };
      if (status === 'started') updateData.started_at = new Date().toISOString();
      if (['delivered', 'delivery_failed', 'cancelled'].includes(status)) {
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
      if (['delivered', 'delivery_failed', 'cancelled'].includes(status)) {
        await supabase.from('orders').update({ status: status === 'delivery_failed' ? 'cancelled' : status }).eq('id', data.order_id);
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
  },

  async sendDeliveryOtp(req, res) {
    try {
      const { id } = req.params; // delivery_id
      
      // Fetch delivery to get order_id and customer email
      const { data: delivery, error: delErr } = await supabase
        .from('deliveries')
        .select(`
          order_id,
          orders!inner(order_number, users!inner(email))
        `)
        .eq('id', id)
        .single();
        
      if (delErr || !delivery) {
        return res.status(404).json({ success: false, message: "Delivery not found" });
      }

      const userEmail = delivery.orders.users.email;
      const orderNumber = delivery.orders.order_number;
      
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Insert into delivery_otps
      const { error: insertErr } = await supabase
        .from('delivery_otps')
        .insert([{
           order_id: delivery.order_id,
           otp_code: otp,
           expires_at: expiresAt
        }]);

      if (insertErr) throw insertErr;

      // Send email
      await EmailService.sendDeliveryOTPEmail(userEmail, otp, orderNumber);

      res.json({ success: true, message: "OTP sent successfully to the client." });
    } catch (error) {
      console.error('Send Delivery OTP Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

export default employeeController;