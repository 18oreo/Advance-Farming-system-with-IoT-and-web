const express = require('express');
const router = express.Router();
const { getAlerts, resolveAlert, resolveAll } = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getAlerts);
router.put('/:id/resolve', resolveAlert);
router.put('/resolve-all', resolveAll);

module.exports = router;
