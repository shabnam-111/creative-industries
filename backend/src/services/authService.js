import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const AuthService = {
  async register({ email, password, company_name, full_name, gst_number, address, role = 'client' }) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 1. Create the base user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash,
          role,
          full_name,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (userError) throw userError;

    // 2. If registering as a client/customer, create the linked customers row
    if (role === 'client' || role === 'customer') {
      const { error: customerError } = await supabase
        .from('customers')
        .insert([
          {
            user_id: user.id,
            company_name,
            gst_number,
            address,
          },
        ]);

      if (customerError) {
        console.error('⚠️ Failed to create customer profile:', customerError.message);
        throw customerError;
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
      }
    );

    return {
      user: { ...user, company_name, gst_number, address },
      token,
    };
  },

  async login(email, password) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, customers(company_name, gst_number, address)')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new Error('Invalid email or password');
    }

    const passwordMatched = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatched) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
      }
    );

    return {
      user: {
        ...user,
        company_name: user.customers?.company_name || null,
        gst_number: user.customers?.gst_number || null,
        address: user.customers?.address || null,
      },
      token,
    };
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return null;
    }
  },
};