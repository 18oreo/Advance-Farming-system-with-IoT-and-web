const express = require('express');
const router = express.Router();
const { getReadings, getLatestReading, getStatistics, getChartData } = require('../controllers/sensorController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getReadings);
router.get('/latest', getLatestReading);
router.get('/stats', getStatistics);
router.get('/chart', getChartData);

module.exports = router;
