const Alert = require('../models/Alert');
const { syncThingSpeakDataForUser } = require('./thingspeakController');

const getAlerts = async (req, res) => {
  try {
    const { resolved, severity, limit = 50 } = req.query;
    const filter = { user: req.user._id };
    if (resolved !== undefined) filter.resolved = resolved === 'true';
    if (severity) filter.severity = severity;

    await syncThingSpeakDataForUser(req.user);

    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
    const unreadCount = await Alert.countDocuments({ user: req.user._id, resolved: false });
    res.json({ success: true, data: alerts, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { resolved: true, resolvedAt: new Date() },
      { new: true }
    );
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resolveAll = async (req, res) => {
  try {
    await Alert.updateMany({ user: req.user._id, resolved: false }, { resolved: true, resolvedAt: new Date() });
    res.json({ success: true, message: 'All alerts resolved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAlerts, resolveAlert, resolveAll };
