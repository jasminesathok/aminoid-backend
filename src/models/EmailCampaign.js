const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const EmailCampaign = {
  list: (eid) => db.query('SELECT * FROM email_campaigns WHERE enterprise_id = ? ORDER BY created_at DESC', [eid]),
  listSent: (eid) => db.query("SELECT * FROM email_campaigns WHERE status = 'Sent' AND enterprise_id = ?", [eid]),
  findById:    (id) => db.query('SELECT * FROM email_campaigns WHERE id = ?', [id]),

  create: ({ subject, list, recipients, status, scheduled_at, campaign_id, eid }) => {
    const id = uuidv4();
    return db.query(
      "INSERT INTO email_campaigns (id, subject, list, recipients, opens, clicks, unsubscribes, status, scheduled_at, campaign_id, enterprise_id) VALUES (?,?,?,?,0,0,0,?,?,?,?)",
      [id, subject, list || 'All Subscribers', recipients || 0, status || 'Draft', scheduled_at || null, campaign_id || null, eid]
    ).then(() => id);
  },

  update: (id, { subject, list, recipients, opens, clicks, unsubscribes, status, scheduled_at, campaign_id }) =>
    db.query(
      'UPDATE email_campaigns SET subject=COALESCE(?,subject), list=COALESCE(?,list), recipients=COALESCE(?,recipients), opens=COALESCE(?,opens), clicks=COALESCE(?,clicks), unsubscribes=COALESCE(?,unsubscribes), status=COALESCE(?,status), scheduled_at=COALESCE(?,scheduled_at), campaign_id=COALESCE(?,campaign_id) WHERE id=?',
      [subject, list, recipients, opens, clicks, unsubscribes, status, scheduled_at, campaign_id, id]
    ),

  delete: (id) => db.query('DELETE FROM email_campaigns WHERE id = ?', [id]),

  // Templates
  listTemplates:   () => db.query('SELECT * FROM email_templates ORDER BY created_at DESC'),
  findTemplateById:(id) => db.query('SELECT * FROM email_templates WHERE id = ?', [id]),

  createTemplate: ({ name, category }) => {
    const id = uuidv4();
    return db.query(
      'INSERT INTO email_templates (id, name, category, uses) VALUES (?,?,?,0)',
      [id, name, category || 'General']
    ).then(() => id);
  },

  deleteTemplate: (id) => db.query('DELETE FROM email_templates WHERE id = ?', [id]),


incrementTemplateUses: (id) =>
  db.query('UPDATE email_templates SET uses = uses + 1 WHERE id = ?', [id]),
};

module.exports = EmailCampaign;
