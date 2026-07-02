const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  entryId: { type: Number, default: null },
  channelId: { type: String, default: '' },
  type: {
    type: String,
    enum: ['temperature', 'humidity', 'soilMoisture', 'lightIntensity', 'co2Level', 'rainfall', 'system'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  message: { type: String, required: true },
  value: { type: Number },
  threshold: { type: Number },
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date }
}, { timestamps: true });

alertSchema.index(
  { user: 1, entryId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user: { $exists: true },
      entryId: { $type: 'number' },
      type: { $exists: true },
    },
  }
);

module.exports = mongoose.model('Alert', alertSchema);
