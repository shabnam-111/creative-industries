import { AuthService } from '../services/authService.js';

export const sendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) throw new Error('Email is required');
    const result = await AuthService.sendRegisterOtp(email);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, company_name, full_name, gst_number, address, phone, role = 'client', otp } = req.body;
    const result = await AuthService.register({ email, password, company_name, full_name, gst_number, address, phone, role, otp });
    res.status(201).json({ success: true, message: 'Registration successful', user: result.user, token: result.token });
  } catch (error) {
    console.error('Register Controller Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json({ success: true, user: result.user, token: result.token });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

export const sendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) throw new Error('Email is required');
    const result = await AuthService.sendForgotPasswordOtp(email);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) throw new Error('Email, OTP, and new password are required');
    const result = await AuthService.resetPassword(email, otp, newPassword);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};