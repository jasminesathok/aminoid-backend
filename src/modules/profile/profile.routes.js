const express = require('express');
const router  = express.Router();
const { getProfile, updateProfile, updatePassword } = require('./profile.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/',  getProfile);
router.put('/',  updateProfile);
router.put('/password', updatePassword);

module.exports = router;
