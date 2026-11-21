const db = require('../config/db');

const FAQ = {
  list: (eid) => db.query('SELECT * FROM faq WHERE enterprise_id = ? ORDER BY category, created_at', [eid]),
  findById: (id) => db.query('SELECT * FROM faq WHERE id = ?', [id]),
};

module.exports = FAQ;
