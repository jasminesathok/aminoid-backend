const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Leave = {
  list: (enterpriseId) =>
    db.query(
      'SELECT l.*, e.name AS employee_name, e.department FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE l.enterprise_id = ? ORDER BY l.created_at DESC',
      [enterpriseId]
    ),

  findById: (id) =>
    db.query(
      'SELECT l.*, e.name AS employee_name, e.department FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE l.id = ?',
      [id]
    ),

  findByEmployee: (employeeId) =>
    db.query(
      'SELECT l.*, e.name AS employee_name, e.department FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE l.employee_id = ? ORDER BY l.created_at DESC',
      [employeeId]
    ),

  countPending: (enterpriseId) =>
    db.query("SELECT COUNT(*) AS c FROM leaves WHERE status = 'Pending' AND enterprise_id = ?", [enterpriseId]),

  create: ({ employeeId, type, startDate, endDate, reason, enterpriseId }) => {
    const id = uuidv4();
    return db.query(
      "INSERT INTO leaves (id, employee_id, type, start_date, end_date, reason, status, enterprise_id) VALUES (?,?,?,?,?,?,'Pending',?)",
      [id, employeeId, type || 'Annual', startDate, endDate, reason || null, enterpriseId || null]
    ).then(() => id);
  },

  updateStatus: (id, status) =>
    db.query('UPDATE leaves SET status = ? WHERE id = ?', [status, id]),

  updateDetails: (id, { type, startDate, endDate, reason, status }) =>
    db.query(
      'UPDATE leaves SET type=COALESCE(?,type), start_date=COALESCE(?,start_date), end_date=COALESCE(?,end_date), reason=COALESCE(?,reason), status=COALESCE(?,status) WHERE id=?',
      [type, startDate, endDate, reason, status, id]
    ),

  delete: (id) =>
    db.query('DELETE FROM leaves WHERE id = ?', [id]),
};

module.exports = Leave;
