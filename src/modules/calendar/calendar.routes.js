const express = require('express');
const router = express.Router();
const { getEvents, createEvent, updateEvent, deleteEvent } = require('./calendar.controller');
const { protect } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

router.use(protect, tenancy);

router.get('/',        getEvents);
router.post('/',       createEvent);
router.put('/:id',     updateEvent);
router.delete('/:id',  deleteEvent);

module.exports = router;
