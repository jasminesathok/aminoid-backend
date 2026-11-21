const db = require('../config/db');

const Transaction = {
  list: (eid) => db.query('SELECT * FROM transactions WHERE enterprise_id = ? ORDER BY date DESC', [eid]),
  sumByType:   (type) => db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = ?", [type]),
  sumCredits: (eid) => eid
    ? db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'Credit' AND enterprise_id = ?", [eid])
    : db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'Credit'"),
  sumDebits: (eid) => eid
    ? db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'Debit' AND enterprise_id = ?", [eid])
    : db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'Debit'"),
  listFiltered:(filters) => {
    const { sql, params } = filters;
    return db.query(`SELECT date, type, amount, party, description FROM transactions WHERE 1=1 ${sql} ORDER BY date DESC LIMIT 200`, params);
  },
};

module.exports = Transaction;
