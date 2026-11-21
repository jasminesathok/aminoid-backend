const express = require('express');
const router = express.Router();
const { getSalesReport, getAnalyticsReport, getPerformanceReport, getReportsOverview, runCustomReport, getSavedReports, saveCustomReport, deleteSavedReport } = require('./reports.controller');
const { protect } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

router.use(protect, tenancy);

router.get('/overview',    getReportsOverview);
router.get('/sales',       getSalesReport);
router.get('/analytics',   getAnalyticsReport);
router.get('/performance', getPerformanceReport);

router.get('/custom',      getSavedReports);
router.post('/custom',     saveCustomReport);
router.post('/custom/run', runCustomReport);
router.delete('/custom/:id', deleteSavedReport);

module.exports = router;
