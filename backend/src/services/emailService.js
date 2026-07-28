// src/services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.mailtrap.io';
const EMAIL_PORT = Number(process.env.EMAIL_PORT) || 2525;
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '"Creative Industries" <orders@creativeindustries.com>';

if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn('⚠️ WARNING: EMAIL_USER and EMAIL_PASS environment variables are not configured. Nodemailer emails will not be sent successfully.');
}

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

export class EmailService {
  /**
   * Sends an email notification to the customer confirming their order has been placed.
   * @param {string} userEmail - Destination customer email address.
   * @param {object} order - The created order record.
   */
  static async sendOrderPlacedEmail(userEmail, order) {
    if (!EMAIL_USER || !EMAIL_PASS) return;

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.name} (${item.sku})</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.price}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.price * item.quantity}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: `Order Confirmation - #${order.order_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #0B3D91; border-bottom: 2px solid #0B3D91; padding-bottom: 10px;">Order Placed Successfully</h2>
          <p>Dear Customer,</p>
          <p>Thank you for placing your order with <strong>Creative Industries</strong>. Your order is currently being reviewed by our team.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td><strong>Order Number:</strong></td>
              <td>#${order.order_number}</td>
            </tr>
            <tr>
              <td><strong>Date:</strong></td>
              <td>${new Date(order.created_at || Date.now()).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td><strong>Order Status:</strong></td>
              <td><span style="background: #FFF3CD; color: #856404; padding: 3px 8px; border-radius: 3px; font-size: 0.9em; font-weight: bold;">PENDING</span></td>
            </tr>
          </table>

          <h3 style="color: #333; margin-top: 20px;">Ordered Items</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Product</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Qty</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Unit Price</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Total Amount (incl. GST):</td>
                <td style="padding: 8px; border-top: 2px solid #333; text-align: right; font-weight: bold;">₹${order.total_amount}</td>
              </tr>
            </tfoot>
          </table>

          <p style="margin-top: 20px;">If you have any questions, please contact our support team at support@creativeindustries.com.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
          <p style="font-size: 0.8em; color: #777; text-align: center;">Creative Industries B2B sheet metal stamping solutions. Faridabad, India.</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Confirmation email dispatched to ${userEmail} for Order #${order.order_number}`);
    } catch (err) {
      console.error('❌ Failed to send order placed email notification:', err.message);
    }
  }

  /**
   * Sends an email notification to the customer when their order is accepted, dispatched, or delivered.
   * @param {string} userEmail - Destination customer email address.
   * @param {object} order - The updated order record.
   */
  static async sendOrderStatusUpdatedEmail(userEmail, order) {
    if (!EMAIL_USER || !EMAIL_PASS) return;

    const statusColors = {
      pending: { bg: '#FFF3CD', text: '#856404' },
      accepted: { bg: '#D4EDDA', text: '#155724' },
      rejected: { bg: '#F8D7DA', text: '#721C24' },
      dispatched: { bg: '#CCE5FF', text: '#004085' },
      delivered: { bg: '#D4EDDA', text: '#155724' }
    };

    const currentStatus = order.status.toLowerCase();
    const color = statusColors[currentStatus] || { bg: '#E2E3E5', text: '#383D41' };

    const mailOptions = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: `Order Status Update: #${order.order_number} is ${order.status.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #0B3D91; border-bottom: 2px solid #0B3D91; padding-bottom: 10px;">Order Status Update</h2>
          <p>Dear Customer,</p>
          <p>The status of your order <strong>#${order.order_number}</strong> has been updated to:</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <span style="background-color: ${color.bg}; color: ${color.text}; padding: 10px 20px; border-radius: 4px; font-size: 1.2em; font-weight: bold; text-transform: uppercase;">
              ${order.status}
            </span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td><strong>Order Number:</strong></td>
              <td>#${order.order_number}</td>
            </tr>
            <tr>
              <td><strong>Total Invoice Amount:</strong></td>
              <td>₹${order.total_amount}</td>
            </tr>
            ${order.vehicle_number ? `
            <tr>
              <td><strong>Transport Vehicle Number:</strong></td>
              <td><strong style="color: #0B3D91;">${order.vehicle_number}</strong></td>
            </tr>` : ''}
            ${order.remarks ? `
            <tr>
              <td><strong>Remarks/Update Notes:</strong></td>
              <td><em>${order.remarks}</em></td>
            </tr>` : ''}
          </table>

          <p>You can track the progress of your order directly on your dashboard.</p>
          <p>If you have any questions, please contact our support team at support@creativeindustries.com.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
          <p style="font-size: 0.8em; color: #777; text-align: center;">Creative Industries B2B sheet metal stamping solutions. Faridabad, India.</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Status update email dispatched to ${userEmail} (Status: ${order.status.toUpperCase()})`);
    } catch (err) {
      console.error('❌ Failed to send order status update email notification:', err.message);
    }
  }

  /**
   * Sends an OTP for registration email verification.
   * @param {string} userEmail - Destination email address.
   * @param {string} otp - The 6-digit OTP code.
   */
  static async sendOTPVerificationEmail(userEmail, otp) {
    if (!EMAIL_USER || !EMAIL_PASS) return;

    const mailOptions = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: `Your Registration Verification Code: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #0B3D91; text-align: center;">Verify Your Email</h2>
          <p>Hello,</p>
          <p>Thank you for registering with Creative Industries. To complete your registration, please enter the following verification code:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 15px 30px; border-radius: 5px; border: 1px dashed #ccc;">
              ${otp}
            </span>
          </div>
          <p style="color: #666; font-size: 0.9em; text-align: center;">This code will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 OTP Verification email dispatched to ${userEmail}`);
    } catch (err) {
      console.error('❌ Failed to send OTP verification email:', err.message);
    }
  }

  /**
   * Sends an OTP for password reset.
   * @param {string} userEmail - Destination email address.
   * @param {string} otp - The 6-digit OTP code.
   */
  static async sendPasswordResetEmail(userEmail, otp) {
    if (!EMAIL_USER || !EMAIL_PASS) return;

    const mailOptions = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: `Password Reset Request Code: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #0B3D91; text-align: center;">Reset Your Password</h2>
          <p>Hello,</p>
          <p>We received a request to reset the password for your Creative Industries account. Enter the following code to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 15px 30px; border-radius: 5px; border: 1px dashed #ccc;">
              ${otp}
            </span>
          </div>
          <p style="color: #666; font-size: 0.9em; text-align: center;">This code will expire in 10 minutes.</p>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Password Reset email dispatched to ${userEmail}`);
    } catch (err) {
      console.error('❌ Failed to send password reset email:', err.message);
    }
  }

  /**
   * Sends an OTP for delivery verification.
   * @param {string} userEmail - Destination customer email address.
   * @param {string} otp - The 6-digit OTP code.
   * @param {string} orderNumber - The order number for reference.
   */
  static async sendDeliveryOTPEmail(userEmail, otp, orderNumber) {
    if (!EMAIL_USER || !EMAIL_PASS) return;

    const mailOptions = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: `Delivery Verification Code for Order #${orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #0B3D91; text-align: center;">Delivery Verification</h2>
          <p>Hello,</p>
          <p>Your delivery for <strong>Order #${orderNumber}</strong> has arrived! Please provide the following 6-digit secure code to our delivery executive to verify and accept your delivery:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 15px 30px; border-radius: 5px; border: 1px dashed #ccc;">
              ${otp}
            </span>
          </div>
          <p style="color: #666; font-size: 0.9em; text-align: center;">This code will expire in 10 minutes.</p>
          <p>Thank you for choosing Creative Industries.</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Delivery OTP email dispatched to ${userEmail} for Order #${orderNumber}`);
    } catch (err) {
      console.error('❌ Failed to send delivery OTP email:', err.message);
    }
  }
}
