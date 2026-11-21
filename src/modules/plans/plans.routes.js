const express = require('express');
const router = express.Router();
const plansController = require('./plans.controller');
const { protect, superAdminOnly } = require('../../middleware/auth');

router.get('/', plansController.getPlans);

router.post('/', protect, superAdminOnly, plansController.createPlan);
router.put('/:id', protect, superAdminOnly, plansController.updatePlan);
router.delete('/:id', protect, superAdminOnly, plansController.deletePlan);

module.exports = router;
