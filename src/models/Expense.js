const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Expense = {
  list: (eid) => db.query('SELECT * FROM expenses WHERE enterprise_id = ? ORDER BY date DESC', [eid]),
  findById: (id) => db.query('SELECT * FROM expenses WHERE id = ?', [id]),

  create: ({ category, amount, date, description, enterpriseId }) => {
    const id = uuidv4();
    return db.query(
      "INSERT INTO expenses (id, category, amount, date, description, status, enterprise_id) VALUES (?,?,?,?,?,'Pending',?)",
      [id, category, amount, date || null, description || null, enterpriseId || null]
    ).then(() => id);
  },

  update: (id, { category, amount, description, status, date }) =>
    db.query(
      'UPDATE expenses SET category=COALESCE(?,category), amount=COALESCE(?,amount), description=COALESCE(?,description), status=COALESCE(?,status), date=COALESCE(?,date) WHERE id=?',
      [category, amount, description, status, date, id]
    ),

  delete: (id) => db.query('DELETE FROM expenses WHERE id = ?', [id]),
};

module.exports = Expense;
