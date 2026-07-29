import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { EmailService } from './emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Helper to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const AuthService = {
  // Generates and sends OTP for registration
  async sendRegisterOtp(email) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    const { error } = await supabase.from('otps').insert([{
      email,
      otp_code: otp,
      type: 'register',
      expires_at: expiresAt.toISOString()
    }]);

    if (error) throw new Error('Failed to generate OTP');

    await EmailService.sendOTPVerificationEmail(email, otp);
    return { message: 'OTP sent to email successfully' };
  },

  async register({ email, password, company_name, full_name, gst_number, address, phone, role = 'client', otp }) {
    if (!otp) throw new Error('OTP is required for registration');

    // 1. Verify OTP
    const { data: otpRecord } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('type', 'register')
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

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

    // 2. Create the base user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{ email, password_hash, role, full_name, phone, status: 'active' }])
      .select()
      .single();

    if (userError) throw userError;

    // 3. Mark OTP as used
    await supabase.from('otps').update({ is_used: true }).eq('id', otpRecord.id);

    // 4. Create customer profile if needed
    if (role === 'client' || role === 'customer') {
      const { error: customerError } = await supabase
        .from('customers')
        .insert([{ user_id: user.id, company_name, gst_number, address }]);

      if (customerError) {
        console.error('⚠️ Failed to create customer profile:', customerError.message);
        throw customerError;
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      user: { ...user, company_name, gst_number, address, phone },
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

    const passwordMatched = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatched) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
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

  async sendForgotPasswordOtp(email) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      throw new Error('No account found with that email address');
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    const { error } = await supabase.from('otps').insert([{
      email,
      otp_code: otp,
      type: 'reset',
      expires_at: expiresAt.toISOString()
    }]);

    if (error) throw new Error('Failed to generate OTP');

    await EmailService.sendPasswordResetEmail(email, otp);
    return { message: 'Password reset OTP sent to email' };
  },

  async resetPassword(email, otp, newPassword) {
    // 1. Verify OTP
    const { data: otpRecord } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('type', 'reset')
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('email', email);

    if (updateError) throw new Error('Failed to reset password');

    // Mark OTP as used
    await supabase.from('otps').update({ is_used: true }).eq('id', otpRecord.id);

    return { message: 'Password has been reset successfully' };
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return null;
    }
  },
};