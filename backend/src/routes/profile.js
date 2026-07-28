import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, customers(company_name, gst_number, address)')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;

    res.json({
      success: true,
      data: {
        fullName: data.full_name,
        email: data.email,
        phone: data.phone,
        companyName: data.customers?.company_name,
        gstNumber: data.customers?.gst_number,
        address: data.customers?.address,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/', verifyToken, async (req, res) => {
  try {
    const { fullName, phone, companyName, gstNumber, address } = req.body;

    const userUpdate = {};
    if (fullName !== undefined) userUpdate.full_name = fullName;
    if (phone !== undefined) userUpdate.phone = phone;
    if (Object.keys(userUpdate).length > 0) {
      const { error } = await supabase.from('users').update(userUpdate).eq('id', req.user.id);
      if (error) throw error;
    }

    const customerUpdate = {};
    if (companyName !== undefined) customerUpdate.company_name = companyName;
    if (gstNumber !== undefined) customerUpdate.gst_number = gstNumber;
    if (address !== undefined) customerUpdate.address = address;
    if (Object.keys(customerUpdate).length > 0) {
      const { error } = await supabase.from('customers').update(customerUpdate).eq('user_id', req.user.id);
      if (error) throw error;
    }

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;