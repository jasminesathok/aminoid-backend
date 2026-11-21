const express = require('express');
const router  = express.Router();
const {
  getCompanySettings, updateCompanySettings,
  getIntegrations, toggleIntegration,
  getUsers, updateUserRole, updateUser, deleteUser,
} = require('./setup.controller');
const { protect } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

const {
  getWebhooks, createWebhook, updateWebhook, deleteWebhook, getWebhookLogs, retryWebhookLog, handleIncomingWebhook
} = require('./webhooks.controller');

// Public route for incoming webhooks (no auth required)
router.post('/webhooks/incoming/:webhookId', handleIncomingWebhook);

router.use(protect, tenancy);   // ← add tenancy

router.get('/company',  getCompanySettings);
router.put('/company',  updateCompanySettings);

router.get('/integrations',          getIntegrations);
router.put('/integrations/:slug',    toggleIntegration);

router.get('/users',              getUsers);
router.put('/users/:id/role',     updateUserRole);
router.put('/users/:id',          updateUser);
router.delete('/users/:id',       deleteUser);

router.get('/webhooks', getWebhooks);
router.post('/webhooks', createWebhook);
router.put('/webhooks/:id', updateWebhook);
router.delete('/webhooks/:id', deleteWebhook);
router.get('/webhooks/:id/logs', getWebhookLogs);
router.post('/webhooks/:id/logs/:logId/retry', retryWebhookLog);

module.exports = router;
