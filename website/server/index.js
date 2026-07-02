require('./config/loadEnv');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');

if (!process.env.MONGO_URI) {
  console.error('❌ Missing MONGO_URI in .env. Set MONGO_URI with your MongoDB connection string.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET in .env. Set JWT_SECRET to a secure random string.');
  process.exit(1);
}

const sensorRoutes = require('./routes/sensorRoutes');
const authRoutes = require('./routes/authRoutes');
const alertRoutes = require('./routes/alertRoutes');
const thingspeakRoutes = require('./routes/thingspeakRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const User = require('./models/User');
const SensorReading = require('./models/SensorReading');
const Alert = require('./models/Alert');
const { syncThingSpeakData } = require('./controllers/thingspeakController');

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10,
  socketTimeoutMS: 45000,
})
  .then(async () => {
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Connected to: ${process.env.MONGO_URI.split('@')[1]?.split('?')[0] || 'localhost'}`);
    
    // Sync indexes
    await SensorReading.collection.dropIndex('entryId_1').catch(() => {});
    await Promise.all([
      User.syncIndexes(),
      SensorReading.syncIndexes(),
      Alert.syncIndexes(),
    ]);
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    if (err.message.includes('authentication failed')) {
      console.error('💡 Authentication failed. Check:');
      console.error('   1. MongoDB is running with --auth');
      console.error('   2. Username and password in MONGO_URI are correct');
      console.error('   3. User exists in the database');
    } else if (err.message.includes('ECONNREFUSED')) {
      console.error('💡 MongoDB is not running. Start with: mongod --auth');
    }
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/thingspeak', thingspeakRoutes);
app.use('/api/weather', weatherRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ [SERVER ERROR]', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.warn(`⚠️  404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Auto-sync ThingSpeak data every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  console.log('Syncing ThingSpeak data...');
  try {
    await syncThingSpeakData();
  } catch (err) {
    console.error('Sync error:', err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ AgriTech Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  console.log(`\n📧 Email service: Will be initialized on first OTP request`);
  console.log(`   (Install nodemailer if not already: npm install nodemailer)`);
  console.log(`${'='.repeat(60)}\n`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`   Kill the process: lsof -ti:${PORT} | xargs kill -9`);
    console.error(`   Or use a different port: PORT=5001 npm run dev\n`);
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
