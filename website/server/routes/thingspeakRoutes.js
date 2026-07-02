const express = require('express');
const router = express.Router();
const { getLatestData, getFeeds, getChannelInfo, syncData, writeData } = require('../controllers/thingspeakController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/latest', getLatestData);
router.get('/feeds', getFeeds);
router.get('/channel', getChannelInfo);
router.post('/sync', syncData);
router.post('/write', writeData);

module.exports = router;
