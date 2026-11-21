const express = require('express');
const router  = express.Router();
const {
  getMegaStats, getUsers,
  getEnterprises, overrideEnterprise,
  getCoupons, createCoupon, deleteCoupon,
  getSettings, updateSettings,
  getIntegratedMetrics
} = require('./superadmin.controller');
const { protect, adminOnly, superAdminOnly } = require('../../middleware/auth');

router.use(protect);

// Admin + super_admin
router.get('/mega-stats', adminOnly, getMegaStats);
router.get('/users',      adminOnly, getUsers);
router.get('/integrated-metrics', adminOnly, getIntegratedMetrics);

// Super admin only
router.get('/enterprises',               superAdminOnly, getEnterprises);
router.post('/enterprises/:id/override', superAdminOnly, overrideEnterprise);
router.get('/coupons',                   superAdminOnly, getCoupons);
router.post('/coupons',                  superAdminOnly, createCoupon);
router.delete('/coupons/:id',            superAdminOnly, deleteCoupon);
router.get('/settings',                  superAdminOnly, getSettings);
router.put('/settings',                  superAdminOnly, updateSettings);

module.exports = router;

