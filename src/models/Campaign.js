const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Campaign = {
  list: (eid) => db.query('SELECT * FROM campaigns WHERE enterprise_id = ? ORDER BY created_at DESC', [eid]),
  findById: (id) => db.query('SELECT * FROM campaigns WHERE id = ?', [id]),
  count: (eid) => eid 
    ? db.query('SELECT COUNT(*) AS c FROM campaigns WHERE enterprise_id = ?', [eid])
    : db.query('SELECT COUNT(*) AS c FROM campaigns'),
  countByStatus: (status, eid) => eid
    ? db.query('SELECT COUNT(*) AS c FROM campaigns WHERE status = ? AND enterprise_id = ?', [status, eid])
    : db.query('SELECT COUNT(*) AS c FROM campaigns WHERE status = ?', [status]),
  sumBudget: (eid) => eid
  ? db.query('SELECT COALESCE(SUM(budget), 0) AS total FROM campaigns WHERE enterprise_id = ?', [eid])
  : db.query('SELECT COALESCE(SUM(budget), 0) AS total FROM campaigns'),

sumSpent: (eid) => eid
  ? db.query('SELECT COALESCE(SUM(spent), 0) AS total FROM campaigns WHERE enterprise_id = ?', [eid])
  : db.query('SELECT COALESCE(SUM(spent), 0) AS total FROM campaigns'),

  create: ({ name, channel, budget, eid }) => {
    const id = uuidv4();
    return db.query(
      "INSERT INTO campaigns (id, name, channel, status, budget, spent, leads, conversions, enterprise_id) VALUES (?,?,?,'Planning',?,0,0,0,?)",
      [id, name, channel || 'Email', budget || 0, eid]
    ).then(() => id);
  },

  update: (id, { name, channel, status, budget, spent, leads, conversions }) =>
    db.query(
      'UPDATE campaigns SET name=COALESCE(?,name), channel=COALESCE(?,channel), status=COALESCE(?,status), budget=COALESCE(?,budget), spent=COALESCE(?,spent), leads=COALESCE(?,leads), conversions=COALESCE(?,conversions) WHERE id=?',
      [name, channel, status, budget, spent, leads, conversions, id]
    ),

  incrementLead: (id) => db.query('UPDATE campaigns SET leads = leads + 1 WHERE id = ?', [id]),
  incrementConversion: (id) => db.query('UPDATE campaigns SET conversions = conversions + 1 WHERE id = ?', [id]),
  addSpent: (id, amount) => db.query('UPDATE campaigns SET spent = spent + ? WHERE id = ?', [amount, id]),

  delete: (id) => db.query('DELETE FROM campaigns WHERE id = ?', [id]),
};

module.exports = Campaign;
