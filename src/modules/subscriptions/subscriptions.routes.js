const express = require('express');
const router  = express.Router();
const {
  getSubscription, upgradePlan, getUsage, getBillingHistory,
} = require('./subscriptions.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/',        getSubscription);
router.put('/plan',    upgradePlan);
router.get('/usage',   getUsage);
router.get('/billing', getBillingHistory);

module.exports = router;
