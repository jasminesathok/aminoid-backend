const express = require('express');
const router = express.Router();
const { getFiles, createFile, deleteFile } = require('./files.controller');
const { protect } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

router.use(protect, tenancy);

router.get('/',        getFiles);
router.post('/',       createFile);
router.delete('/:id', deleteFile);

module.exports = router;
