/**
 * Email Service for sending OTPs and notifications
 *
 * Configuration via .env:
 * - EMAIL_SERVICE: Service provider (for example gmail, outlook, custom SMTP)
 * - EMAIL_USER: Sender email address
 * - EMAIL_PASSWORD: Email password or app password
 * - EMAIL_FROM: Display name (optional)
 */

let nodemailer = null;
let transporterError = null;
let transporter = null;

const PLACEHOLDER_PATTERNS = [
  'your-email',
  'your-app-password',
  'your_password',
  'change_this',
  'example.com',
];

try {
  nodemailer = require('nodemailer');
  console.log('[EMAIL] Nodemailer loaded successfully');
} catch (err) {
  transporterError = 'nodemailer not installed. Run: npm install nodemailer';
  console.error('[EMAIL] Nodemailer load error:', transporterError);
}

const isPlaceholderValue = (value = '') => {
  const normalizedValue = String(value).trim().toLowerCase();
  return PLACEHOLDER_PATTERNS.some((pattern) => normalizedValue.includes(pattern));
};

const getEmailConfigStatus = () => {
  if (transporterError) {
    return {
      ready: false,
      reason: 'dependency_missing',
      message: 'Nodemailer is not installed',
    };
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return {
      ready: false,
      reason: 'config_missing',
      message: 'EMAIL_USER and EMAIL_PASSWORD must be set in server/.env',
    };
  }

  if (isPlaceholderValue(process.env.EMAIL_USER) || isPlaceholderValue(process.env.EMAIL_PASSWORD)) {
    return {
      ready: false,
      reason: 'config_placeholder',
      message: 'Email credentials in server/.env still use placeholder values',
    };
  }

  return {
    ready: true,
    reason: 'ready',
    message: 'Email configuration looks valid',
  };
};

const initializeTransporter = () => {
  const configStatus = getEmailConfigStatus();
  if (!configStatus.ready) {
    if (configStatus.reason === 'dependency_missing') {
      console.warn('[EMAIL] Service not available:', transporterError);
    } else if (configStatus.reason === 'config_missing') {
      console.warn('[EMAIL] Email not configured in server/.env');
      console.warn('  EMAIL_USER:', process.env.EMAIL_USER ? '***' : 'NOT SET');
      console.warn('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' : 'NOT SET');
    } else if (configStatus.reason === 'config_placeholder') {
      console.warn('[EMAIL] Email credentials still contain placeholder values');
    }
    return null;
  }

  if (transporter) {
    return transporter;
  }

  console.log('[EMAIL] Initializing email transporter...');
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  console.log('[EMAIL] Email transporter initialized');
  return transporter;
};

const sendOTPEmail = async (email, otp, name = 'User') => {
  try {
    const transport = initializeTransporter();
    if (!transport) {
      const configStatus = getEmailConfigStatus();
      console.warn(`[EMAIL] Email service not initialized for ${email}`);
      console.warn('  Check EMAIL_USER and EMAIL_PASSWORD in server/.env');
      return {
        success: false,
        reason: configStatus.reason,
        message: configStatus.reason === 'config_placeholder'
          ? 'Email delivery is not configured yet. Replace the placeholder email credentials in server/.env.'
          : 'Email service not configured',
      };
    }

    const subject = 'AgriTechPro Password Reset OTP';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-box {
            background: white;
            border: 2px solid #2ecc71;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            border-radius: 8px;
          }
          .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: #2ecc71;
            letter-spacing: 4px;
            margin: 10px 0;
          }
          .expiry { color: #e74c3c; font-weight: bold; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AgriTechPro</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            <p>We received a request to reset your password. Use the OTP below to proceed:</p>

            <div class="otp-box">
              <p style="margin: 0; color: #666; font-size: 14px;">Your One-Time Password</p>
              <div class="otp-code">${otp}</div>
              <p class="expiry">Valid for 10 minutes only</p>
            </div>

            <p><strong>Security Note:</strong></p>
            <ul>
              <li>Never share this OTP with anyone</li>
              <li>AgriTechPro staff will never ask for your OTP</li>
              <li>If you did not request this, ignore this email</li>
            </ul>

            <p style="margin-top: 30px; font-size: 12px; color: #999;">
              If you have questions, contact support.
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AgriTechPro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
AgriTechPro Password Reset OTP

Hello ${name},

Your One-Time Password (OTP) is: ${otp}

Valid for: 10 minutes

Security Note:
- Never share this OTP with anyone
- AgriTechPro staff will never ask for your OTP
- If you did not request this, ignore this email

---
Copyright ${new Date().getFullYear()} AgriTechPro
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject,
      html: htmlContent,
      text: textContent,
    };

    console.log(`[EMAIL] Sending OTP email to: ${email}`);
    const info = await transport.sendMail(mailOptions);
    console.log(`[EMAIL] OTP email sent to ${email}:`, info.messageId);
    return { success: true, message: 'OTP sent to email' };
  } catch (error) {
    console.error(`[EMAIL] Failed to send OTP email to ${email}:`);
    console.error('  Error:', error.message);
    console.error('  Code:', error.code || 'unknown');

    if (error.code === 'EAUTH') {
      console.error('  Fix: Check EMAIL_USER and EMAIL_PASSWORD in server/.env');
      return {
        success: false,
        reason: 'auth_failed',
        message: 'Email login failed. Update EMAIL_USER and EMAIL_PASSWORD with a real Gmail address and app password.',
      };
    }

    return {
      success: false,
      reason: 'delivery_failed',
      message: `Email error: ${error.message}`,
    };
  }
};

module.exports = { sendOTPEmail, initializeTransporter, getEmailConfigStatus };
