const SensorReading = require('../models/SensorReading');
const { CHART_FIELDS, STAT_FIELDS, serializeSensorReading } = require('../utils/sensorData');
const { syncThingSpeakDataForUser } = require('./thingspeakController');

const getReadings = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 50;
    const field = req.query.field;
    const skip = (page - 1) * limit;
    const filter = { user: req.user._id };

    await syncThingSpeakDataForUser(req.user);

    const projection = field ? { [field]: 1, thingspeakCreatedAt: 1, entryId: 1 } : {};
    const readings = await SensorReading.find(filter, projection)
      .sort({ thingspeakCreatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SensorReading.countDocuments(filter);
    res.json({
      success: true,
      data: readings.map(serializeSensorReading),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLatestReading = async (req, res) => {
  try {
    await syncThingSpeakDataForUser(req.user);
    const reading = await SensorReading.findOne({ user: req.user._id }).sort({ thingspeakCreatedAt: -1 });
    res.json({ success: true, data: serializeSensorReading(reading) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStatistics = async (req, res) => {
  try {
    const hours = Number.parseInt(req.query.hours, 10) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    await syncThingSpeakDataForUser(req.user);

    const readings = await SensorReading.find({ user: req.user._id, thingspeakCreatedAt: { $gte: since } })
      .sort({ thingspeakCreatedAt: 1 });

    const stats = {};
    for (const field of STAT_FIELDS) {
      const values = readings
        .map((reading) => reading[field])
        .filter((value) => value !== null && value !== undefined);

      if (!values.length) {
        stats[field] = null;
        continue;
      }

      stats[field] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((total, value) => total + value, 0) / values.length,
        latest: values[values.length - 1],
        count: values.length,
      };
    }

    res.json({ success: true, stats, period: `${hours}h`, count: readings.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getChartData = async (req, res) => {
  try {
    const field = req.query.field || 'temperature';
    const hours = Number.parseInt(req.query.hours, 10) || 24;

    if (!CHART_FIELDS.includes(field)) {
      return res.status(400).json({ success: false, message: 'Unsupported chart field' });
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    await syncThingSpeakDataForUser(req.user);
    const readings = await SensorReading.find(
      { user: req.user._id, thingspeakCreatedAt: { $gte: since }, [field]: { $ne: null } },
      { [field]: 1, thingspeakCreatedAt: 1 }
    )
      .sort({ thingspeakCreatedAt: 1 })
      .limit(200);

    const chartData = readings.map((reading) => ({
      time: reading.thingspeakCreatedAt,
      value: reading[field],
    }));

    res.json({ success: true, field, data: chartData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getReadings, getLatestReading, getStatistics, getChartData };
