const express = require('express');
const router  = express.Router();
const {
  getCampaigns, createCampaign, updateCampaign, deleteCampaign,
  getLeads, createLead, updateLead, deleteLead,
  getMarketingStats,
  getEmails, getEmailStats, createEmail, updateEmail, deleteEmail,
  getEmailTemplates, createEmailTemplate, getEmailTemplateById, updateEmailTemplate, deleteEmailTemplate, useEmailTemplate,
  getSocialPosts, getSocialStats, createSocialPost, updateSocialPost, deleteSocialPost,
  getInfluencers, createInfluencer, updateInfluencer, deleteInfluencer,
  getFieldEvents, createFieldEvent, updateFieldEvent, deleteFieldEvent,
} = require('./marketing.controller');
const { protect } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

router.use(protect, tenancy);

// Stats
router.get('/stats', getMarketingStats);

// Campaigns
router.get('/campaigns',        getCampaigns);
router.post('/campaigns',       createCampaign);
router.put('/campaigns/:id',    updateCampaign);
router.delete('/campaigns/:id', deleteCampaign);

// Leads
router.get('/leads',        getLeads);
router.post('/leads',       createLead);
router.put('/leads/:id',    updateLead);
router.delete('/leads/:id', deleteLead);

// Email campaigns
router.get('/email/stats',        getEmailStats);
router.get('/email',              getEmails);
router.post('/email',             createEmail);
router.put('/email/:id',          updateEmail);
router.delete('/email/:id',       deleteEmail);

// Email templates
router.get('/email/templates',            getEmailTemplates);
router.post('/email/templates',           createEmailTemplate);
router.get('/email/templates/:id',        getEmailTemplateById);
router.put('/email/templates/:id',        updateEmailTemplate);
router.delete('/email/templates/:id',     deleteEmailTemplate);
router.post('/email/templates/:id/use', useEmailTemplate);

// Social media
router.get('/social/stats',    getSocialStats);
router.get('/social',          getSocialPosts);
router.post('/social',         createSocialPost);
router.put('/social/:id',      updateSocialPost);
router.delete('/social/:id',   deleteSocialPost);

// Influencer Marketing
router.get('/influencers',        getInfluencers);
router.post('/influencers',       createInfluencer);
router.put('/influencers/:id',    updateInfluencer);
router.delete('/influencers/:id', deleteInfluencer);

// Field Marketing
router.get('/field-events',        getFieldEvents);
router.post('/field-events',       createFieldEvent);
router.put('/field-events/:id',    updateFieldEvent);
router.delete('/field-events/:id', deleteFieldEvent);

module.exports = router;
