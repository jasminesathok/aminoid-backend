const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Employee = {
  list: (enterpriseId) =>
    db.query('SELECT * FROM employees WHERE enterprise_id = ? ORDER BY name', [enterpriseId]),

  findById: (id) =>
    db.query('SELECT * FROM employees WHERE id = ?', [id]),

  findByUser: (userId) =>
    db.query('SELECT * FROM employees WHERE user_id = ?', [userId]),

  findByEmployeeCode: (code) =>
    db.query('SELECT * FROM employees WHERE employee_code = ?', [code]),

  create: ({ name, role, department, salary, joinDate, userId, employeeCode, phone, email, emergencyContact, enterpriseId, rank, accountNo, ifscCode, uan, esi, branch }) => {
    const id = uuidv4();
    return db.query(
      "INSERT INTO employees (id, user_id, employee_code, name, role, department, salary, status, join_date, phone, email, emergency_contact, enterprise_id, emp_rank, account_no, ifsc_code, uan, esi, branch) VALUES (?,?,?,?,?,?,?,'Active',?,?,?,?,?,?,?,?,?,?,?)",
      [id, userId || null, employeeCode || null, name, role, department || '', salary || 0,
       joinDate || new Date().toISOString().split('T')[0],
       phone || null, email || null, emergencyContact || null, enterpriseId || null,
       rank || null, accountNo || null, ifscCode || null, uan || null, esi || null, branch || null]
    ).then(() => id);
  },

  update: (id, { name, role, department, salary, status, phone, email, emergencyContact, rank, accountNo, ifscCode, uan, esi, branch, joinDate, employeeCode }) =>
    db.query(
      'UPDATE employees SET name=COALESCE(?,name), role=COALESCE(?,role), department=COALESCE(?,department), salary=COALESCE(?,salary), status=COALESCE(?,status), phone=COALESCE(?,phone), email=COALESCE(?,email), emergency_contact=COALESCE(?,emergency_contact), emp_rank=COALESCE(?,emp_rank), account_no=COALESCE(?,account_no), ifsc_code=COALESCE(?,ifsc_code), uan=COALESCE(?,uan), esi=COALESCE(?,esi), branch=COALESCE(?,branch), join_date=COALESCE(?,join_date), employee_code=COALESCE(?,employee_code) WHERE id=?',
      [name, role, department, salary, status, phone, email, emergencyContact, rank, accountNo, ifscCode, uan, esi, branch, joinDate, employeeCode, id]
    ),

  delete: (id) => db.query('DELETE FROM employees WHERE id = ?', [id]),
};

module.exports = Employee;
