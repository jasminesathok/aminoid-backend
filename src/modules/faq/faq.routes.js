const express = require('express');
const router = express.Router();
const { getFAQ, getFAQItem } = require('./faq.controller');
const { protect } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

router.use(protect, tenancy);

router.get('/',      getFAQ);
router.get('/:id',  getFAQItem);

module.exports = router;
