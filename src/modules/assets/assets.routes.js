const express = require('express');
const router = express.Router();
const { getAssets, createAsset, updateAsset, deleteAsset } = require('./assets.controller');
const { protect } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

router.use(protect, tenancy);

router.get('/', getAssets);
router.post('/', createAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

module.exports = router;
