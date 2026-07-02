const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  channelId: { type: String, default: '' },
  entryId: { type: Number },
  temperature: { type: Number, default: null },
  humidity: { type: Number, default: null },
  lightIntensity: { type: Number, default: null },
  soilMoisture: { type: Number, default: null },
  soilMoistureRaw: { type: Number, default: null },
  inletPump: { type: Boolean, default: null },
  rainDetected: { type: Boolean, default: null },
  outletPump: { type: Boolean, default: null },
  createdAt: { type: Date, default: Date.now },
  thingspeakCreatedAt: { type: Date },
}, { timestamps: true });

sensorReadingSchema.index(
  { user: 1, entryId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user: { $exists: true },
      entryId: { $type: 'number' },
    },
  }
);
sensorReadingSchema.index({ thingspeakCreatedAt: -1 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
