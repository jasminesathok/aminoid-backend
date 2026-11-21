const Campaign      = require('../../models/Campaign');
const Lead          = require('../../models/Lead');
const EmailCampaign = require('../../models/EmailCampaign');
const SocialPost    = require('../../models/SocialPost');
const db            = require('../../config/db');

/* ── Campaigns ────────────────────────────────────────────────── */
const getCampaigns = async (req, res) => {
  try {
    const [r] = await Campaign.list(req.enterpriseId);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getCampaigns error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createCampaign = async (req, res) => {
  const { name, channel, budget } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Campaign name required' });
  try {
    const id  = await Campaign.create({ name, channel, budget, eid: req.enterpriseId });
    const [r] = await Campaign.findById(id);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('createCampaign error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateCampaign = async (req, res) => {
  const { name, channel, status, budget, spent, leads, conversions } = req.body;
  try {
    await Campaign.update(req.params.id, { name, channel, status, budget, spent, leads, conversions });
    const [r] = await Campaign.findById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateCampaign error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const [result] = await Campaign.delete(req.params.id);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    console.error('deleteCampaign error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Leads ────────────────────────────────────────────────────── */
const getLeads = async (req, res) => {
  try {
    const [r] = await Lead.list(req.enterpriseId);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getLeads error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ✅ FIXED
const createLead = async (req, res) => {
  const { name, company, email, address, value, source, status, campaign_id, phone, job_title, lead_score, assigned_to, follow_up_date, notes } = req.body; 
  if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email required' });
  try {
    const id  = await Lead.create({ name, company, email, address, value, source, status, campaign_id, phone, job_title, lead_score, assigned_to, follow_up_date, notes, eid: req.enterpriseId });
    if (campaign_id) {
      await Campaign.incrementLead(campaign_id);
    }
    const [r] = await Lead.findById(id);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) { console.error('createLead error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' }); }
};


const useEmailTemplate = async (req, res) => {
  try {
    await EmailCampaign.incrementTemplateUses(req.params.id);
    const [r] = await EmailCampaign.findTemplateById(req.params.id);
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('useEmailTemplate error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



const updateLead = async (req, res) => {
  const { name, company, email, address, status, value, source, campaign_id, phone, job_title, lead_score, assigned_to, follow_up_date, notes } = req.body;
  try {
    const [existing] = await Lead.findById(req.params.id);
    const wasClosedWon = existing.length && existing[0].status === 'Closed Won';
    
    await Lead.update(req.params.id, { name, company, email, address, status, value, source, campaign_id, phone, job_title, lead_score, assigned_to, follow_up_date, notes });
    const [r] = await Lead.findById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'Lead not found' });
    
    // Check if newly converted to Closed Won
    if (!wasClosedWon && status === 'Closed Won' && r[0].campaign_id) {
      await Campaign.incrementConversion(r[0].campaign_id);
    }
    
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateLead error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteLead = async (req, res) => {
  try {
    const [result] = await Lead.delete(req.params.id);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    console.error('deleteLead error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Marketing Stats ──────────────────────────────────────────── */
const getMarketingStats = async (req, res) => {
  try {
    const eid = req.enterpriseId;
    const isSA = req.user.role === 'super_admin';
    // Pass null as eid for super_admin so model methods skip the WHERE clause
    const queryEid = isSA ? null : eid;

    const [[tl]] = await Lead.count(queryEid);
    const [[cw]] = await Lead.countByStatus('Closed Won', queryEid);
    const [[tv]] = await Lead.sumValue(queryEid);
    const [[tb]] = await Campaign.sumBudget(queryEid);
    const [[ts]] = await Campaign.sumSpent(queryEid);

    // Channel breakdown from campaigns
    const [channelRows] = await db.query(
  `SELECT channel,
          COALESCE(SUM(leads), 0)       AS total_leads,
          COALESCE(SUM(budget), 0)       AS total_budget,
          COALESCE(SUM(spent), 0)        AS total_spent,
          COALESCE(SUM(conversions), 0)  AS total_conversions
   FROM campaigns
   ${isSA ? '' : 'WHERE enterprise_id = ?'}
   GROUP BY channel ORDER BY total_leads DESC`,
  isSA ? [] : [eid]
);

    // Lead funnel from lead statuses
    const [funnelRows] = await db.query(
  `SELECT status, COUNT(*) AS count FROM leads
   ${isSA ? '' : 'WHERE enterprise_id = ?'}
   GROUP BY status`,
  isSA ? [] : [eid]
);

    // Closed-won lead value by month, for the overview revenue trend.
    const [revenueRows] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key, COALESCE(SUM(value), 0) AS value
       FROM leads
       WHERE status = 'Closed Won'
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
         ${isSA ? '' : 'AND enterprise_id = ?'}
       GROUP BY month_key
       ORDER BY month_key`,
      isSA ? [] : [eid]
    );
    const revenueByMonth = Object.fromEntries(revenueRows.map(row => [row.month_key, Number(row.value)]));
    const revenueTrend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return { label: date.toLocaleString('en-US', { month: 'short' }), value: revenueByMonth[key] || 0 };
    });

    const statusMap = {};
    funnelRows.forEach(r => { statusMap[r.status] = r.count; });
    const total = tl.c || 0;
    const contacted   = funnelRows.filter(r => !['New'].includes(r.status)).reduce((s, r) => s + r.count, 0);
    const qualified   = funnelRows.filter(r => ['Qualified','Demo','Proposal','Closed Won'].includes(r.status)).reduce((s, r) => s + r.count, 0);
    const demo        = funnelRows.filter(r => ['Demo','Proposal','Closed Won'].includes(r.status)).reduce((s, r) => s + r.count, 0);
    const closedWonC  = statusMap['Closed Won'] || 0;

    const funnel = [
      { label: 'Total Leads', value: total,      pct: 100 },
      { label: 'Contacted',   value: contacted,  pct: total ? Math.round((contacted  / total) * 100) : 0 },
      { label: 'Qualified',   value: qualified,  pct: total ? Math.round((qualified  / total) * 100) : 0 },
      { label: 'Demo',        value: demo,       pct: total ? Math.round((demo       / total) * 100) : 0 },
      { label: 'Closed Won',  value: closedWonC, pct: total ? Math.round((closedWonC / total) * 100) : 0 },
    ];

    const maxLeads = channelRows.length ? Math.max(...channelRows.map(r => Number(r.total_leads)), 1) : 1;
    const channels = channelRows.map(r => ({
      name:        r.channel,
      leads:       Number(r.total_leads),
      pct:         Math.round((Number(r.total_leads) / maxLeads) * 100),
      spend:       Number(r.total_spent) > 0 ? '$' + Number(r.total_spent).toLocaleString() : '$0',
      conversions: Number(r.total_conversions),
    }));

    res.json({
      success: true,
      data: {
        totalLeads: tl.c, closedWon: cw.c,
        conversionRate:     tl.c ? ((cw.c / tl.c) * 100).toFixed(1) : '0.0',
        totalPipelineValue: Number(tv.total),
        totalBudget:        Number(tb.total),
        totalSpent:         Number(ts.total),
        channels,
        funnel,
        revenueTrend,
      },
    });
  } catch (err) {
    console.error('getMarketingStats error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Email Marketing ──────────────────────────────────────────── */
const getEmails = async (req, res) => {
  try {
    const [r] = await EmailCampaign.list(req.enterpriseId);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getEmails error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getEmailStats = async (req, res) => {
  try {
    const [r]         = await EmailCampaign.listSent(req.enterpriseId);
    const totalSent   = r.reduce((s, e) => s + (e.recipients || 0), 0);
    const totalOpens  = r.reduce((s, e) => s + (e.opens     || 0), 0);
    const totalClicks = r.reduce((s, e) => s + (e.clicks    || 0), 0);
    const totalUnsubs = r.reduce((s, e) => s + (e.unsubscribes || 0), 0);
    res.json({
      success: true,
      data: {
        totalSent, totalOpens, totalClicks, totalUnsubs,
        avgOpenRate:  totalSent > 0 ? ((totalOpens  / totalSent) * 100).toFixed(1) : '0.0',
        avgClickRate: totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0',
      },
    });
  } catch (err) {
    console.error('getEmailStats error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createEmail = async (req, res) => {
  const { subject, list, recipients, status, scheduled_at } = req.body;
  if (!subject) return res.status(400).json({ success: false, message: 'Subject is required' });
  try {
    const id  = await EmailCampaign.create({ subject, list, recipients, status, scheduled_at, eid: req.enterpriseId });
    const [r] = await EmailCampaign.findById(id);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('createEmail error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateEmail = async (req, res) => {
  const { subject, list, recipients, opens, clicks, unsubscribes, status, scheduled_at } = req.body;
  try {
    await EmailCampaign.update(req.params.id, { subject, list, recipients, opens, clicks, unsubscribes, status, scheduled_at });
    const [r] = await EmailCampaign.findById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'Email campaign not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateEmail error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteEmail = async (req, res) => {
  try {
    const [result] = await EmailCampaign.delete(req.params.id);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Email campaign not found' });
    res.json({ success: true, message: 'Email campaign deleted' });
  } catch (err) {
    console.error('deleteEmail error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getEmailTemplates = async (req, res) => {
  try {
    const [r] = await EmailCampaign.listTemplates();
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getEmailTemplates error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createEmailTemplate = async (req, res) => {
  const { name, category } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Template name is required' });
  try {
    const id  = await EmailCampaign.createTemplate({ name, category });
    const [r] = await EmailCampaign.findTemplateById(id);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('createEmailTemplate error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteEmailTemplate = async (req, res) => {
  try {
    const [result] = await EmailCampaign.deleteTemplate(req.params.id);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    console.error('deleteEmailTemplate error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getEmailTemplateById = async (req, res) => {
  try {
    const [r] = await EmailCampaign.findTemplateById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('getEmailTemplateById error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateEmailTemplate = async (req, res) => {
  try {
    const { name, category, subject, body } = req.body;
    await db.query(
      'UPDATE email_templates SET name=COALESCE(?,name), category=COALESCE(?,category), subject=COALESCE(?,subject), body=COALESCE(?,body) WHERE id=?',
      [name, category, subject, body, req.params.id]
    );
    const [r] = await EmailCampaign.findTemplateById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateEmailTemplate error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Social Media ─────────────────────────────────────────────── */
const getSocialPosts = async (req, res) => {
  try {
    const [r] = await SocialPost.list(req.enterpriseId);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getSocialPosts error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getSocialStats = async (req, res) => {
  try {
    const [r] = await SocialPost.listStats(req.enterpriseId);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getSocialStats error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createSocialPost = async (req, res) => {
  const { content, platform, status, scheduled_at } = req.body;
  if (!content || !platform)
    return res.status(400).json({ success: false, message: 'Content and platform are required' });
  try {
    const id  = await SocialPost.create({ content, platform, status, scheduled_at, eid: req.enterpriseId });
    const [r] = await SocialPost.findById(id);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('createSocialPost error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateSocialPost = async (req, res) => {
  const { content, platform, status, likes, comments, shares, reach, scheduled_at } = req.body;
  try {
    await SocialPost.update(req.params.id, { content, platform, status, likes, comments, shares, reach, scheduled_at });
    const [r] = await SocialPost.findById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'Social post not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateSocialPost error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteSocialPost = async (req, res) => {
  try {
    const [result] = await SocialPost.delete(req.params.id);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Social post not found' });
    res.json({ success: true, message: 'Social post deleted' });
  } catch (err) {
    console.error('deleteSocialPost error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Influencer Marketing ─────────────────────────────────────── */
const getInfluencers = async (req, res) => {
  try {
    const [r] = await db.query('SELECT * FROM marketing_influencers WHERE enterprise_id = ? ORDER BY created_at DESC', [req.enterpriseId]);
    res.json({ success: true, data: r });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createInfluencer = async (req, res) => {
  try {
    const { name, platform, handle, followers, niche, status, budget, campaign_id } = req.body;
    const b = budget || 0;
    await db.query('INSERT INTO marketing_influencers (name, platform, handle, followers, niche, status, budget, campaign_id, enterprise_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [name, platform, handle, followers||0, niche, status||'Contacted', b, campaign_id || null, req.enterpriseId]);
    
    if (campaign_id && b > 0) {
      const Campaign = require('../../models/Campaign');
      await Campaign.addSpent(campaign_id, b);
    }
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateInfluencer = async (req, res) => {
  try {
    const { name, platform, handle, followers, niche, status, budget, campaign_id } = req.body;
    await db.query(
      'UPDATE marketing_influencers SET name=COALESCE(?,name), platform=COALESCE(?,platform), handle=COALESCE(?,handle), followers=COALESCE(?,followers), niche=COALESCE(?,niche), status=COALESCE(?,status), budget=COALESCE(?,budget), campaign_id=COALESCE(?,campaign_id) WHERE id=?',
      [name, platform, handle, followers, niche, status, budget, campaign_id, req.params.id]
    );
    const [[r]] = await db.query('SELECT * FROM marketing_influencers WHERE id=?', [req.params.id]);
    if (!r) return res.status(404).json({ success: false, message: 'Influencer not found' });
    res.json({ success: true, data: r });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteInfluencer = async (req, res) => {
  try {
    await db.query('DELETE FROM marketing_influencers WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── Field Marketing ──────────────────────────────────────────── */
const getFieldEvents = async (req, res) => {
  try {
    const [r] = await db.query('SELECT * FROM marketing_field_events WHERE enterprise_id = ? ORDER BY date ASC', [req.enterpriseId]);
    res.json({ success: true, data: r });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createFieldEvent = async (req, res) => {
  try {
    const { name, location, type, status, budget, leads_target, date, campaign_id } = req.body;
    const b = budget || 0;
    await db.query('INSERT INTO marketing_field_events (name, location, type, status, budget, leads_target, date, campaign_id, enterprise_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [name, location, type, status||'Planning', b, leads_target||0, date, campaign_id || null, req.enterpriseId]);
    
    if (campaign_id && b > 0) {
      const Campaign = require('../../models/Campaign');
      await Campaign.addSpent(campaign_id, b);
    }
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateFieldEvent = async (req, res) => {
  try {
    const { name, location, type, status, budget, leads_target, date, campaign_id } = req.body;
    await db.query(
      'UPDATE marketing_field_events SET name=COALESCE(?,name), location=COALESCE(?,location), type=COALESCE(?,type), status=COALESCE(?,status), budget=COALESCE(?,budget), leads_target=COALESCE(?,leads_target), date=COALESCE(?,date), campaign_id=COALESCE(?,campaign_id) WHERE id=?',
      [name, location, type, status, budget, leads_target, date, campaign_id, req.params.id]
    );
    const [[r]] = await db.query('SELECT * FROM marketing_field_events WHERE id=?', [req.params.id]);
    if (!r) return res.status(404).json({ success: false, message: 'Field event not found' });
    res.json({ success: true, data: r });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteFieldEvent = async (req, res) => {
  try {
    await db.query('DELETE FROM marketing_field_events WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getCampaigns, createCampaign, updateCampaign, deleteCampaign,
  getLeads, createLead, updateLead, deleteLead,
  getMarketingStats,
  getEmails, getEmailStats, createEmail, updateEmail, deleteEmail,
  getEmailTemplates, createEmailTemplate, getEmailTemplateById, updateEmailTemplate, deleteEmailTemplate,
  getSocialPosts, getSocialStats, createSocialPost, updateSocialPost, deleteSocialPost,
  getInfluencers, createInfluencer, updateInfluencer, deleteInfluencer,
  getFieldEvents, createFieldEvent, updateFieldEvent, deleteFieldEvent,
  useEmailTemplate
};
