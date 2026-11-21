const express = require('express');
const router  = express.Router();
const { getStats, getRecentActivity, getRevenueChart } = require('./dashboard.controller');
const { protect } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

router.use(protect, tenancy);

router.get('/stats',    getStats);
router.get('/recent-activity', getRecentActivity);
router.get('/revenue-chart',  getRevenueChart);

module.exports = router;
