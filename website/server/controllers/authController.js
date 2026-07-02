const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getSensorConfig } = require('../utils/sensorData');
const { sendOTPEmail } = require('../utils/emailService');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const normalizeEmail = (email = '') => email.toLowerCase().trim();
const SELF_SERVICE_ROLES = new Set(['farmer', 'agronomist']);
const normalizeSelfServiceRole = (role) => (
  SELF_SERVICE_ROLES.has(role) ? role : 'farmer'
);
const sanitizeUser = (user) => {
  const sensorConfig = getSensorConfig(user);

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    farm: user.farm,
    preferences: user.preferences,
    sensorConfig: {
      channelId: sensorConfig.channelId,
      baseUrl: sensorConfig.baseUrl,
      name: sensorConfig.name,
    },
    isLoggedIn: Boolean(user.isLoggedIn),
    lastLoginAt: user.lastLoginAt,
  };
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, farm, sensorConfig } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const mergedSensorConfig = {
      ...getSensorConfig({ sensorConfig }),
      name: sensorConfig?.name?.trim() || farm?.name?.trim() || 'Sensor Channel',
    };

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: normalizeSelfServiceRole(role),
      farm,
      sensorConfig: mergedSensorConfig,
      isLoggedIn: true,
      lastLoginAt: new Date(),
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.isLoggedIn = true;
    user.lastLoginAt = new Date();
    user.lastLogoutAt = null;
    await user.save();

    res.json({
      success: true,
      token: generateToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProfile = async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.body.name) user.name = String(req.body.name).trim();
    if (req.body.email) user.email = normalizeEmail(req.body.email);
    if (req.body.password) user.password = req.body.password;
    if (req.body.role) user.role = normalizeSelfServiceRole(req.body.role);

    if (req.body.farm) {
      user.farm = { ...(user.farm || {}), ...req.body.farm };
    }

    if (req.body.preferences) {
      user.preferences = { ...(user.preferences || {}), ...req.body.preferences };
    }

    if (req.body.sensorConfig) {
      user.sensorConfig = {
        ...getSensorConfig(user),
        ...req.body.sensorConfig,
      };
    }

    await user.save();
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isLoggedIn: false,
      lastLogoutAt: new Date(),
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    console.log(`[FORGOT-PASSWORD] Request received for email: ${email}`);
    
    if (!email) {
      console.log('[FORGOT-PASSWORD] Email is empty');
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[FORGOT-PASSWORD] User not found for email: ${email}`);
      return res.status(404).json({ success: false, message: 'No account found with that email' });
    }

    console.log(`[FORGOT-PASSWORD] User found, generating OTP for: ${email}`);
    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    console.log(`[FORGOT-PASSWORD] OTP generated for ${email}, sending email...`);
    const emailResult = await sendOTPEmail(email, otp, user.name);
    console.log(`[FORGOT-PASSWORD] Email result:`, emailResult);
    
    if (emailResult.success) {
      return res.json({
        success: true,
        message: `OTP sent to ${email}. Check your email for a 6-digit code.`,
      });
    }

    return res.status(503).json({
      success: false,
      message: emailResult.message || 'Unable to send OTP email right now. Please try again later.',
    });
  } catch (error) {
    console.error('[FORGOT-PASSWORD] Error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isOTPValid(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified. You can now set a new password.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { newPassword, otp } = req.body;

    if (!email || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'A valid email and password are required' });
    }

    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isOTPValid(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Request a new one.' });
    }

    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now sign in with your new password.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, logout, getProfile, updateProfile, forgotPassword, verifyOTP, resetPassword };
