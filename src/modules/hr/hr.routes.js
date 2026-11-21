const express = require('express');
const router  = express.Router();
const {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getPayroll,
  getAttendance, markAttendance, getAttendanceById, updateAttendance, deleteAttendance,
  getLeaves, applyLeave, updateLeave, deleteLeave,
  getHRStats,
  getUsers,
  getMyEmployee, getMyPayslip, getMyAttendance, getMyLeave, applyMyLeave,
  getHROthers, markMyAttendance,  getMyPayslipPDF
} = require('./hr.controller');
const { protect, adminOnly } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');

router.use(protect, tenancy);

/* ── Admin-only ─────────────────────────────────────────────── */
router.get('/stats',               adminOnly, getHRStats);
router.get('/employees',           adminOnly, getEmployees);
router.post('/employees',          adminOnly, createEmployee);
router.put('/employees/:id',       adminOnly, updateEmployee);
router.delete('/employees/:id',    adminOnly, deleteEmployee);
router.get('/payroll',             adminOnly, getPayroll);
router.get('/attendance',          adminOnly, getAttendance);
router.post('/attendance',         adminOnly, markAttendance);
router.get('/attendance/:id',      adminOnly, getAttendanceById);
router.put('/attendance/:id',      adminOnly, updateAttendance);
router.delete('/attendance/:id',   adminOnly, deleteAttendance);
router.get('/leaves',              adminOnly, getLeaves);
router.post('/leaves',             adminOnly, applyLeave);
router.put('/leaves/:id',          adminOnly, updateLeave);
router.delete('/leaves/:id',       adminOnly, deleteLeave);
router.get('/users',               adminOnly, getUsers);

/* ── Others (announcements / trainings / awards / docs) ─────── */
router.get('/others', getHROthers);

/* ── Member self-service ────────────────────────────────────── */
router.get('/my/employee',   getMyEmployee);
router.get('/my/payslip',    getMyPayslip);
router.get('/my/payslip/pdf', getMyPayslipPDF);
router.get('/my/attendance', getMyAttendance);
router.get('/my/leave',      getMyLeave);
router.post('/my/leave',     applyMyLeave);
router.post('/my/attendance', markMyAttendance);  

module.exports = router;
