const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const CustomReport = {
  list: (eid) => db.query('SELECT * FROM custom_reports WHERE enterprise_id = ? ORDER BY created_at DESC', [eid]),
  findById: (id) => db.query('SELECT * FROM custom_reports WHERE id = ?', [id]),

  create: ({ name, source, fields, filters, viz_type, enterpriseId }) => {
    const id = uuidv4();
    return db.query(
      'INSERT INTO custom_reports (id, name, source, fields, filters, viz_type, enterprise_id) VALUES (?,?,?,?,?,?,?)',
      [id, name, source, JSON.stringify(fields || []), JSON.stringify(filters || []), viz_type || 'table']
    ).then(() => id);
  },

  delete: (id) => db.query('DELETE FROM custom_reports WHERE id = ?', [id]),
};

module.exports = CustomReport;
