const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Attendance = {
  list: (enterpriseId) =>
    db.query(
      'SELECT a.*, e.name AS employee_name, e.department FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.enterprise_id = ? ORDER BY a.date DESC',
      [enterpriseId]
    ),

  findById: (id) =>
    db.query(
      'SELECT a.*, e.name AS employee_name, e.department FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.id = ?',
      [id]
    ),

  findByEmployee: (employeeId) =>
    db.query(
      'SELECT a.*, e.name AS employee_name, e.department FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.employee_id = ? ORDER BY a.date DESC',
      [employeeId]
    ),

  mark: ({ employeeId, date, checkIn, checkOut, status, enterpriseId }) => {
    const id = uuidv4();
    return db.query(
      'INSERT INTO attendance (id, employee_id, date, check_in, check_out, status, enterprise_id) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE check_in=VALUES(check_in), check_out=VALUES(check_out), status=VALUES(status)',
      [id, employeeId, date, checkIn || null, checkOut || null, status || 'Present', enterpriseId || null]
    );
  },

  findByEmployeeAndDate: (employeeId, date) =>
    db.query(
      'SELECT a.*, e.name AS employee_name, e.department FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.employee_id = ? AND a.date = ?',
      [employeeId, date]
    ),

  delete: (id) =>
    db.query('DELETE FROM attendance WHERE id = ?', [id]),

  update: (id, { checkIn, checkOut, status }) =>
    db.query(
      'UPDATE attendance SET check_in=COALESCE(?,check_in), check_out=COALESCE(?,check_out), status=COALESCE(?,status) WHERE id=?',
      [checkIn, checkOut, status, id]
    ),
};

module.exports = Attendance;
