const express = require('express');
const router  = express.Router();
const {
  getKBOverview,
  getArticles, createArticle, updateArticle, deleteArticle,
  getCategories, createCategory, deleteCategory,
} = require('./knowledge.controller');
const { protect } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

router.use(protect, tenancy);

router.get('/overview', getKBOverview);

router.get('/articles',      getArticles);
router.post('/articles',     createArticle);
router.put('/articles/:id',  updateArticle);
router.delete('/articles/:id', deleteArticle);

router.get('/categories',       getCategories);
router.post('/categories',      createCategory);
router.delete('/categories/:id', deleteCategory);

module.exports = router;
