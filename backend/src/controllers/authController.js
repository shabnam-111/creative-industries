import { AuthService } from '../services/authService.js';

export const register = async (req, res) => {
  try {
    const { email, password, company_name, full_name, gst_number, address, role = 'client' } = req.body;
    const result = await AuthService.register({ email, password, company_name, full_name, gst_number, address, role });
    res.status(201).json({ success: true, message: 'Registration successful', data: result });
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

export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};