const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Lead = {
  list: (eid) => db.query('SELECT * FROM leads WHERE enterprise_id = ? ORDER BY created_at DESC', [eid]),
  findById: (id) => db.query('SELECT * FROM leads WHERE id = ?', [id]),
  count: (eid) => eid
  ? db.query('SELECT COUNT(*) AS c FROM leads WHERE enterprise_id = ?', [eid])
  : db.query('SELECT COUNT(*) AS c FROM leads'),

countByStatus: (status, eid) => eid
  ? db.query('SELECT COUNT(*) AS c FROM leads WHERE status = ? AND enterprise_id = ?', [status, eid])
  : db.query('SELECT COUNT(*) AS c FROM leads WHERE status = ?', [status]),

sumValue: (eid) => eid
  ? db.query('SELECT COALESCE(SUM(value), 0) AS total FROM leads WHERE enterprise_id = ?', [eid])
  : db.query('SELECT COALESCE(SUM(value), 0) AS total FROM leads'),

  create: ({ name, company, email, address, value, source, status, campaign_id, phone, job_title, lead_score, assigned_to, follow_up_date, notes, eid }) => {
  const id = uuidv4();
  return db.query(
    "INSERT INTO leads (id, name, company, email, address, status, value, source, campaign_id, phone, job_title, lead_score, assigned_to, follow_up_date, notes, enterprise_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [id, name, company || null, email, address || null, status || 'New', value || 0, source || 'Website', campaign_id || null, phone || null, job_title || null, lead_score || 0, assigned_to || null, follow_up_date || null, notes || null, eid]
  ).then(() => id);
},

  update: (id, { name, company, email, address, status, value, source, campaign_id, phone, job_title, lead_score, assigned_to, follow_up_date, notes }) =>
    db.query(
      'UPDATE leads SET name=COALESCE(?,name), company=COALESCE(?,company), email=COALESCE(?,email), address=COALESCE(?,address), status=COALESCE(?,status), value=COALESCE(?,value), source=COALESCE(?,source), campaign_id=COALESCE(?,campaign_id), phone=COALESCE(?,phone), job_title=COALESCE(?,job_title), lead_score=COALESCE(?,lead_score), assigned_to=COALESCE(?,assigned_to), follow_up_date=COALESCE(?,follow_up_date), notes=COALESCE(?,notes) WHERE id=?',
      [name, company, email, address, status, value, source, campaign_id, phone, job_title, lead_score, assigned_to, follow_up_date, notes, id]
    ),

  delete: (id) => db.query('DELETE FROM leads WHERE id = ?', [id]),
};

module.exports = Lead;
