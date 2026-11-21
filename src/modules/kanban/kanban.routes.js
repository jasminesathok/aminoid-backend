const express = require('express');
const router = express.Router();
const { getBoard, createCard, updateCard, deleteCard } = require('./kanban.controller');
const { protect } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

router.use(protect, tenancy);

router.get('/',           getBoard);
router.post('/cards',    createCard);
router.put('/cards/:id', updateCard);
router.delete('/cards/:id', deleteCard);

module.exports = router;
