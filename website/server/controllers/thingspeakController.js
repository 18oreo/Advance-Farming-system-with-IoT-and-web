const axios = require('axios');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const User = require('../models/User');
const {
  ALERT_FIELDS,
  THRESHOLDS,
  getSensorConfig,
  mapThingSpeakFeed,
  formatFieldLabel,
  serializeSensorReading,
} = require('../utils/sensorData');

const buildChannelUrl = (config, suffix) => (
  `${config.baseUrl}/channels/${config.channelId}${suffix}api_key=${config.readKey}`
);

const buildChannelMeta = (config, details = {}) => ({
  id: config.channelId || details.id || null,
  name: config.name || details.name || 'Sensor Channel',
  description: details.description || '',
  created_at: details.created_at || null,
  last_entry_id: details.last_entry_id || null,
});

const checkAndCreateAlerts = async (reading, userId) => {
  for (const field of ALERT_FIELDS) {
    const value = reading[field];
    const thresholdConfig = THRESHOLDS[field];

    if (value === null || value === undefined || !thresholdConfig) continue;

    let severity = null;
    let message = null;
    let threshold = null;

    if (thresholdConfig.max !== undefined && value > thresholdConfig.max) {
      severity = value > thresholdConfig.max * 1.2 ? 'critical' : 'high';
      threshold = thresholdConfig.max;
      message = `${formatFieldLabel(field)} is too high: ${value}${thresholdConfig.unit} (max: ${threshold}${thresholdConfig.unit})`;
    } else if (thresholdConfig.min !== undefined && value < thresholdConfig.min) {
      severity = value < thresholdConfig.min * 0.7 ? 'critical' : 'medium';
      threshold = thresholdConfig.min;
      message = `${formatFieldLabel(field)} is too low: ${value}${thresholdConfig.unit} (min: ${threshold}${thresholdConfig.unit})`;
    }

    if (severity) {
      try {
        await Alert.create({
          user: userId,
          entryId: reading.entryId,
          channelId: reading.channelId || '',
          type: field,
          severity,
          message,
          value,
          threshold,
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
      }
    }
  }
};

const getLatestData = async (req, res) => {
  try {
    const config = getSensorConfig(req.user);
    await syncThingSpeakDataForUser(req.user);

    const reading = await SensorReading.findOne({ user: req.user._id }).sort({ thingspeakCreatedAt: -1 });
    res.json({
      success: true,
      data: serializeSensorReading(reading),
      channel: buildChannelMeta(config),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getFeeds = async (req, res) => {
  try {
    const config = getSensorConfig(req.user);
    const limit = Math.min(Number.parseInt(req.query.results, 10) || 100, 500);
    await syncThingSpeakDataForUser(req.user);

    const readings = await SensorReading.find({ user: req.user._id })
      .sort({ thingspeakCreatedAt: -1 })
      .limit(limit);

    let channel = buildChannelMeta(config);
    try {
      const response = await axios.get(buildChannelUrl(config, '/feeds.json?results=1&'));
      channel = buildChannelMeta(config, response.data.channel);
    } catch (error) {
      // Fallback to stored channel metadata if the upstream channel request fails.
    }

    res.json({
      success: true,
      channel,
      data: readings.reverse().map(serializeSensorReading),
      count: readings.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getChannelInfo = async (req, res) => {
  try {
    const config = getSensorConfig(req.user);
    const response = await axios.get(buildChannelUrl(config, '/feeds.json?results=1&'));
    res.json({ success: true, channel: buildChannelMeta(config, response.data.channel) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const syncThingSpeakDataForUser = async (user) => {
  const config = getSensorConfig(user);

  if (!user?._id) {
    throw new Error('User is required to sync sensor data');
  }

  if (!config.channelId || !config.readKey) {
    return 0;
  }

  try {
    const latest = await SensorReading.findOne({ user: user._id }).sort({ entryId: -1 });
    const lastEntryId = latest ? latest.entryId : 0;

    const response = await axios.get(buildChannelUrl(config, '/feeds.json?results=50&'));
    const feeds = Array.isArray(response.data.feeds) ? response.data.feeds : [];

    const newFeeds = feeds.filter((feed) => feed.entry_id > lastEntryId);
    const docs = newFeeds.map((feed) => ({
      ...mapThingSpeakFeed(feed),
      user: user._id,
      channelId: config.channelId,
    }));

    if (docs.length > 0) {
      await SensorReading.insertMany(docs, { ordered: false }).catch(() => {});
      for (const doc of docs) {
        await checkAndCreateAlerts(doc, user._id);
      }
      console.log(`Synced ${docs.length} new readings`);
    }

    return docs.length;
  } catch (error) {
    console.error('Sync error:', error.message);
    throw error;
  }
};

const syncThingSpeakData = async () => {
  const users = await User.find({}, '_id sensorConfig name').lean();
  let total = 0;

  for (const user of users) {
    try {
      total += await syncThingSpeakDataForUser(user);
    } catch (error) {
      console.error(`Sync error for user ${user.email || user._id}:`, error.message);
    }
  }

  return total;
};

const syncData = async (req, res) => {
  try {
    const count = await syncThingSpeakDataForUser(req.user);
    res.json({ success: true, message: `Synced ${count} new records` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const writeData = async (req, res) => {
  try {
    const config = getSensorConfig(req.user);
    const { field1, field2, field3, field4, field5, field6, field7, field8 } = req.body;
    const params = new URLSearchParams();
    params.append('api_key', config.writeKey);

    if (field1 !== undefined) params.append('field1', field1);
    if (field2 !== undefined) params.append('field2', field2);
    if (field3 !== undefined) params.append('field3', field3);
    if (field4 !== undefined) params.append('field4', field4);
    if (field5 !== undefined) params.append('field5', field5);
    if (field6 !== undefined) params.append('field6', field6);
    if (field7 !== undefined) params.append('field7', field7);
    if (field8 !== undefined) params.append('field8', field8);

    const response = await axios.post(`${config.baseUrl}/update`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    res.json({ success: true, entryId: response.data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getLatestData,
  getFeeds,
  getChannelInfo,
  syncThingSpeakData,
  syncThingSpeakDataForUser,
  syncData,
  writeData,
};
