const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'admin', 'agronomist'], default: 'farmer' },
  isLoggedIn: { type: Boolean, default: false },
  lastLoginAt: { type: Date, default: null },
  lastLogoutAt: { type: Date, default: null },
  resetOTP: String,
  resetOTPExpires: Date,
  farm: {
    name: String,
    location: String,
    area: Number,
    cropType: String
  },
  sensorConfig: {
    channelId: {
      type: String,
      default: () => String(process.env.THINGSPEAK_CHANNEL_ID || '')
    },
    readKey: {
      type: String,
      default: () => String(process.env.THINGSPEAK_READ_KEY || '')
    },
    writeKey: {
      type: String,
      default: () => String(process.env.THINGSPEAK_WRITE_KEY || '')
    },
    baseUrl: {
      type: String,
      default: () => String(process.env.THINGSPEAK_BASE_URL || 'https://api.thingspeak.com')
    },
    name: {
      type: String,
      default: 'Sensor Channel'
    }
  },
  preferences: {
    alertsEnabled: { type: Boolean, default: true },
    tempUnit: { type: String, default: 'celsius' }
  }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetOTP = otp;
  this.resetOTPExpires = Date.now() + 600000; // 10 minutes
  return otp;
};

userSchema.methods.isOTPValid = function (otp) {
  if (!this.resetOTP || !this.resetOTPExpires) return false;
  return this.resetOTP === otp && this.resetOTPExpires > Date.now();
};

module.exports = mongoose.model('User', userSchema);
