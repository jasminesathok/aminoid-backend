const Employee   = require('../../models/Employee');
const bcrypt     = require('bcryptjs');
const Attendance = require('../../models/Attendance');
const Leave      = require('../../models/Leave');
const User       = require('../../models/User');
const db         = require('../../config/db');
const { logActivity } = require('../../utils/activity');
const PDFDocument = require('pdfkit');

/* ── Admin: Employees ─────────────────────────────────────────── */
const getEmployees = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    let r;
    if (isSA) {
      [r] = await db.query(`
        SELECT e.*, u.first_name AS owner_first, u.last_name AS owner_last
        FROM employees e
        LEFT JOIN users u ON e.enterprise_id = u.id
        ORDER BY e.enterprise_id, e.created_at DESC
      `);
    } else {
      [r] = await Employee.list(req.enterpriseId);
    }
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getEmployees error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createEmployee = async (req, res) => {
  const { name, role, department, salary, joinDate, phone, email, emergencyContact, rank, accountNo, ifscCode, uan, esi, branch, approvedSections } = req.body;
  if (!name || !role)
    return res.status(400).json({ success: false, message: 'Name and role required' });
  try {
    // 1. Get Enterprise / Company info
    let companyName = 'Employee';
    const [entUsers] = await db.query('SELECT company_name FROM users WHERE id = ?', [req.enterpriseId]);
    if (entUsers.length && entUsers[0].company_name) {
      companyName = entUsers[0].company_name;
    }

    // 2. Generate Company Prefix (First 3 consonants, or just first 3 chars, uppercase)
    const prefix = companyName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'EMP';

    // 3. Determine next sequence number by finding the max existing sequence
    const [empRows] = await db.query('SELECT employee_code FROM employees WHERE enterprise_id = ?', [req.enterpriseId]);
    let maxSeq = 0;
    empRows.forEach(emp => {
      if (emp.employee_code) {
        const parts = emp.employee_code.split('-');
        if (parts.length > 1) {
          const seq = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    });
    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    const employeeCode = req.body.employeeCode || `${prefix}-${nextSeq}`;

    // 4. Determine Email (Dummy if not provided)
    const userEmail = email ? email.toLowerCase() : `${employeeCode.toLowerCase()}@amnoid.local`;

    // 5. Generate Password
    const generatedPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // 6. Create User Account
    const names = name.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || null;

    const newUserId = await User.create({
      firstName,
      lastName,
      email: userEmail,
      hashedPassword,
      role: 'member',
      companyName: null,
      referralCode: null,
      subscriptionStatus: 'TRIAL',
      trialStartAt: null,
      trialEndAt: null,
      kycStatus: 'PENDING',
      enterpriseId: req.enterpriseId
    });

    // 6b. Save approved sidebar sections for the new member
    if (approvedSections && Array.isArray(approvedSections)) {
      await db.query(
        'UPDATE users SET approved_sections = ? WHERE id = ?',
        [JSON.stringify(approvedSections), newUserId]
      );
    }

    // 7. Create Employee Record
    const id  = await Employee.create({ 
      name, role, department, salary, joinDate, 
      userId: newUserId, employeeCode, phone, 
      email: email || userEmail, emergencyContact, 
      enterpriseId: req.enterpriseId, rank, accountNo, 
      ifscCode, uan, esi, branch 
    });

    const [r] = await Employee.findById(id);
    await logActivity(req.user?.id, 'employee', `New employee "${name}" joined`, 'HR', req.enterpriseId);
    
    // 8. Send Email if email is provided
    if (email && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Aminoid <onboarding@resend.dev>',
          to: email,
          subject: `Welcome to ${companyName}! Your Login Details`,
          html: `
            <h2>Welcome, ${name}!</h2>
            <p>Your employee profile has been created at <strong>${companyName}</strong>.</p>
            <p>You can use the following credentials to access the AMINOID portal:</p>
            <ul>
              <li><strong>Employee ID:</strong> ${employeeCode}</li>
              <li><strong>Password:</strong> ${generatedPassword}</li>
            </ul>
            <p>Please log in and change your password as soon as possible.</p>
          `
        });
      } catch (mailErr) {
        console.error('Error sending email:', mailErr);
      }
    }

    // 9. Return with credentials
    res.status(201).json({ 
      success: true, 
      data: r[0], 
      generatedPassword, 
      employeeCode 
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'This email address is already registered to an existing account. Please use a different email.' });
    }
    console.error('createEmployee error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateEmployee = async (req, res) => {
  const { name, role, department, salary, status, phone, email, emergencyContact, rank, accountNo, ifscCode, uan, esi, branch, joinDate, employeeCode } = req.body;
  try {
    await Employee.update(req.params.id, { name, role, department, salary, status, phone, email, emergencyContact, rank, accountNo, ifscCode, uan, esi, branch, joinDate, employeeCode });
    const [r] = await Employee.findById(req.params.id);
    if (!r.length)
      return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateEmployee error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const [result] = await Employee.delete(req.params.id);
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, message: 'Employee deleted' });
  } catch (err) {
    console.error('deleteEmployee error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Admin: Payroll ───────────────────────────────────────────── */
const getPayroll = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    let employees;
    if (isSA) {
      [employees] = await db.query(`
        SELECT e.*, u.first_name AS owner_first, u.last_name AS owner_last
        FROM employees e
        LEFT JOIN users u ON e.enterprise_id = u.id
        ORDER BY e.enterprise_id, e.name ASC
      `);
    } else {
      [employees] = await Employee.list(req.enterpriseId);
    }

    const payroll = employees.map(e => ({
      employeeId:  e.id,
      name:        e.name,
      department:  e.department || '—',
      baseSalary:  Number(e.salary) || 0,
      bonus:       Math.round((Number(e.salary) || 0) * 0.05),
      deductions:  Math.round((Number(e.salary) || 0) * 0.12),
      netPay:      Math.round((Number(e.salary) || 0) + (Number(e.salary) || 0) * 0.05 - (Number(e.salary) || 0) * 0.12),
      status:      'Processed',
      enterprise_id: e.enterprise_id,
      owner_first:   e.owner_first,
      owner_last:    e.owner_last,
      employee_code: e.employee_code,
    }));

    res.json({ success: true, data: payroll });
  } catch (err) {
    console.error('getPayroll error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Admin: Attendance ────────────────────────────────────────── */
const getAttendance = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    let r;
    if (isSA) {
      [r] = await db.query(`
        SELECT a.*, e.name AS employee_name, e.department, e.employee_code,
               u.first_name AS owner_first, u.last_name AS owner_last, e.enterprise_id
        FROM attendance a
        LEFT JOIN employees e ON a.employee_id = e.id
        LEFT JOIN users u ON e.enterprise_id = u.id
        ORDER BY e.enterprise_id, a.date DESC
      `);
    } else {
      [r] = await Attendance.list(req.enterpriseId);
    }
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getAttendance error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const markAttendance = async (req, res) => {
  const { employeeId, date, checkIn, checkOut, status } = req.body;
  if (!employeeId || !date)
    return res.status(400).json({ success: false, message: 'employeeId and date are required' });
  try {
    // Fetch existing record so we don't wipe check_in when only check_out is sent
    const [existing] = await Attendance.findByEmployeeAndDate(employeeId, date);
    const existingRec = existing[0] || {};

    await Attendance.mark({
      employeeId,
      date,
      checkIn:  checkIn  !== undefined ? checkIn  : (existingRec.check_in  || null),
      checkOut: checkOut !== undefined ? checkOut : (existingRec.check_out || null),
      status:   status   || existingRec.status || 'Present',
      enterpriseId: req.enterpriseId,
    });
    const [r] = await Attendance.findByEmployeeAndDate(employeeId, date);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('markAttendance error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const [result] = await Attendance.delete(req.params.id);
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (err) {
    console.error('deleteAttendance error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getAttendanceById = async (req, res) => {
  try {
    const [r] = await Attendance.findById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'Attendance record not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('getAttendanceById error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const { checkIn, checkOut, status } = req.body;
    await Attendance.update(req.params.id, { checkIn, checkOut, status });
    const [r] = await Attendance.findById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'Attendance record not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateAttendance error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Admin: Leaves ────────────────────────────────────────────── */
const getLeaves = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    let r;
    if (isSA) {
      [r] = await db.query(`
        SELECT l.*, e.name AS employee_name, e.department, e.employee_code,
               u.first_name AS owner_first, u.last_name AS owner_last, e.enterprise_id
        FROM leaves l
        LEFT JOIN employees e ON l.employee_id = e.id
        LEFT JOIN users u ON e.enterprise_id = u.id
        ORDER BY e.enterprise_id, l.created_at DESC
      `);
    } else {
      [r] = await Leave.list(req.enterpriseId);
    }
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getLeaves error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const applyLeave = async (req, res) => {
  const { employeeId, type, startDate, endDate, reason } = req.body;
  try {
    const id  = await Leave.create({ employeeId, type, startDate, endDate, reason, enterpriseId: req.enterpriseId });
    const [r] = await Leave.findById(id);
    await logActivity(req.user?.id, 'leave', `New leave request submitted`, 'HR', req.enterpriseId);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('applyLeave error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const markMyAttendance = async (req, res) => {
  try {
    const [emp] = await Employee.findByUser(req.user.id);
    if (!emp.length)
      return res.status(404).json({ success: false, message: 'No employee profile linked to your account.' });

    const today = new Date().toISOString().split('T')[0];
    const { date, checkIn, checkOut, status } = req.body;
    const useDate = date || today;

    // Fetch existing record for today so we don't wipe check_in when checking out
    const [existing] = await Attendance.findByEmployeeAndDate(emp[0].id, useDate);
    const existingRec = existing[0] || {};

  
await Attendance.mark({
  employeeId:   emp[0].id,
  date:         useDate,
  checkIn:      checkIn  !== undefined ? checkIn  : (existingRec.check_in  || null),
  checkOut:     checkOut !== undefined ? checkOut : (existingRec.check_out || null),
  status:       status   || existingRec.status || 'Present',
  enterpriseId: req.enterpriseId,   // ← ADD THIS LINE
});

    const [r] = await Attendance.findByEmployeeAndDate(emp[0].id, useDate);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('markMyAttendance error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateLeave = async (req, res) => {
  const { status, type, startDate, endDate, reason } = req.body;
  try {
    await Leave.updateDetails(req.params.id, { status, type, startDate, endDate, reason });
    const [r] = await Leave.findById(req.params.id);
    if (!r.length)
      return res.status(404).json({ success: false, message: 'Leave not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateLeave error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteLeave = async (req, res) => {
  try {
    const [result] = await Leave.delete(req.params.id);
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: 'Leave not found' });
    res.json({ success: true, message: 'Leave deleted' });
  } catch (err) {
    console.error('deleteLeave error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Admin: HR Stats ──────────────────────────────────────────── */
const getHRStats = async (req, res) => {
  try {
    const eid = req.enterpriseId;
    const isSA = req.user.role === 'super_admin';
    const today = new Date().toISOString().split('T')[0];

    const [[total]]   = await db.query(`SELECT COUNT(*) AS c FROM employees${isSA ? '' : ' WHERE enterprise_id = ?'}`, isSA ? [] : [eid]);
    const [[active]]  = await db.query(`SELECT COUNT(*) AS c FROM employees WHERE status='Active'${isSA ? '' : ' AND enterprise_id = ?'}`, isSA ? [] : [eid]);
    const [[onLeave]] = await db.query(`SELECT COUNT(*) AS c FROM employees WHERE status='On Leave'${isSA ? '' : ' AND enterprise_id = ?'}`, isSA ? [] : [eid]);
    const [[pending]] = await db.query(`SELECT COUNT(*) AS c FROM leaves WHERE status='Pending'${isSA ? '' : ' AND enterprise_id = ?'}`, isSA ? [] : [eid]);
    const [[present]] = await db.query(`SELECT COUNT(*) AS c FROM attendance WHERE date=? AND status='Present'${isSA ? '' : ' AND enterprise_id = ?'}`, isSA ? [today] : [today, eid]);

    res.json({
      success: true,
      data: {
        totalEmployees: total.c, activeEmployees: active.c,
        onLeave: onLeave.c, pendingLeaves: pending.c, todayPresent: present.c,
      },
    });
  } catch (err) {
    console.error('getHRStats error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Admin: Users list (for linking employees) ────────────────── */
const getUsers = async (req, res) => {
  try {
    const [r] = await User.listByEnterprise(req.enterpriseId);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Member: Self-service ─────────────────────────────────────── */
const getMyEmployee = async (req, res) => {
  try {
    const [r] = await Employee.findByUser(req.user.id);
    if (!r.length)
      return res.status(404).json({ success: false, message: 'No employee profile linked to your account.' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('getMyEmployee error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getMyPayslip = async (req, res) => {
  try {
    const [r] = await Employee.findByUser(req.user.id);
    if (!r.length)
      return res.status(404).json({ success: false, message: 'No employee profile linked to your account.' });
    const e = r[0];

   
    const sal        = Number(e.salary) || 0;
    const bonus      = Math.round(sal * 0.05);
    const deductions = Math.round(sal * 0.12);
    const netPay     = sal + bonus - deductions;

    const payslip = {
      employeeId:  e.id,
      name:        e.name,
      role:        e.role,
      department:  e.department,
      baseSalary:  sal,
      bonus:       bonus,
      deductions:  deductions,
      netPay:      netPay,
      payDate:     new Date().toISOString().split('T')[0],
      status:      'Processed',
    };
    res.json({ success: true, data: payslip });
  } catch (err) {
    console.error('getMyPayslip error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const [emp] = await Employee.findByUser(req.user.id);
    if (!emp.length)
      return res.status(404).json({ success: false, message: 'No employee profile linked to your account.' });
    const [r] = await Attendance.findByEmployee(emp[0].id);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getMyAttendance error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getMyLeave = async (req, res) => {
  try {
    const [emp] = await Employee.findByUser(req.user.id);
    if (!emp.length)
      return res.status(404).json({ success: false, message: 'No employee profile linked to your account.' });
    const [r] = await Leave.findByEmployee(emp[0].id);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getMyLeave error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const applyMyLeave = async (req, res) => {
  try {
    const [emp] = await Employee.findByUser(req.user.id);
    if (!emp.length)
      return res.status(404).json({ success: false, message: 'No employee profile linked to your account.' });
    const { type, startDate, endDate, reason } = req.body;
    if (!startDate || !endDate)
      return res.status(400).json({ success: false, message: 'Start and end date required.' });
    const id = await Leave.create({ employeeId: emp[0].id, type, startDate, endDate, reason, enterpriseId: req.enterpriseId });
    const [r] = await Leave.findById(id);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('applyMyLeave error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getHROthers = async (req, res) => {
  try {
    const eid = req.enterpriseId;
    const isSA = req.user.role === 'super_admin';

    const [announcements] = await db.query(
      isSA
        ? 'SELECT * FROM hr_announcements ORDER BY created_at DESC'
        : 'SELECT * FROM hr_announcements WHERE enterprise_id = ? OR enterprise_id IS NULL ORDER BY created_at DESC',
      isSA ? [] : [eid]
    );
    const [trainings] = await db.query(
      isSA
        ? 'SELECT * FROM hr_trainings ORDER BY created_at DESC'
        : 'SELECT * FROM hr_trainings WHERE enterprise_id = ? OR enterprise_id IS NULL ORDER BY created_at DESC',
      isSA ? [] : [eid]
    );
    const [awards] = await db.query(
      isSA
        ? 'SELECT * FROM hr_awards ORDER BY created_at DESC'
        : 'SELECT * FROM hr_awards WHERE enterprise_id = ? OR enterprise_id IS NULL ORDER BY created_at DESC',
      isSA ? [] : [eid]
    );
    const [docs] = await db.query(
      isSA
        ? "SELECT id, name, size, type, modified FROM files WHERE type IN ('pdf','word','excel','document') ORDER BY created_at DESC LIMIT 50"
        : "SELECT id, name, size, type, modified FROM files WHERE enterprise_id = ? AND type IN ('pdf','word','excel','document') ORDER BY created_at DESC LIMIT 20",
      isSA ? [] : [eid]
    );
    res.json({ success: true, data: { announcements, trainings, awards, docs } });
  } catch (err) {
    console.error('getHROthers error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


/* ── Member: Download My Payslip as PDF ───────────────────────────────────── */
                    
const getMyPayslipPDF = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');

    const [empRows] = await Employee.findByUser(req.user.id);
    if (!empRows.length)
      return res.status(404).json({ success: false, message: 'No employee profile linked.' });

    const e          = empRows[0];
    const sal        = Number(e.salary) || 0;
    const bonus      = Math.round(sal * 0.05);
    const deductions = Math.round(sal * 0.12);
    const netPay     = sal + bonus - deductions;
    const payDate    = new Date();
    const monthYear  = payDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const fullDate   = payDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Build PDF entirely in memory first
    const doc    = new PDFDocument({ size: 'A4', margin: 50, compress: false });
    const chunks = [];
    doc.on('data', chunk => chunks.push(Buffer.from(chunk)));

    await new Promise((resolve, reject) => {
      doc.on('end',   resolve);
      doc.on('error', reject);

      const PRIMARY = '#7C3AED';
      const DARK    = '#1e293b';
      const MID     = '#64748b';
      const LIGHT   = '#f8fafc';
      const GREEN   = '#10b981';
      const RED     = '#ef4444';
      const pageW   = doc.page.width;
      const L       = 50;
      const R       = pageW - 50;

      // Header band
      doc.rect(0, 0, pageW, 100).fill(PRIMARY);
      doc.fontSize(24).fillColor('#ffffff').font('Helvetica-Bold').text('AMINOID', L, 28);
      doc.fontSize(10).font('Helvetica').fillColor('#ddd6fe').text('HR & Payroll Management', L, 56);
      doc.fontSize(18).fillColor('#ffffff').font('Helvetica-Bold')
         .text('PAYSLIP', 0, 36, { align: 'right', width: pageW - L });
      doc.fontSize(10).fillColor('#ddd6fe').font('Helvetica')
         .text(monthYear, 0, 58, { align: 'right', width: pageW - L });

      // Employee + Pay Period boxes
      let y = 120;
      const halfW = (pageW - 100) / 2 - 10;

      doc.rect(L, y, halfW, 70).fill(LIGHT).stroke('#e2e8f0');
      doc.fontSize(8).fillColor(MID).font('Helvetica').text('EMPLOYEE', L + 12, y + 10);
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text(e.name, L + 12, y + 24);
      doc.fontSize(9).fillColor(MID).font('Helvetica')
         .text(`${e.role || '-'}  |  ${e.department || '-'}`, L + 12, y + 42);
      doc.fontSize(8).fillColor(MID).text(`Employee ID: ${e.id}`, L + 12, y + 57);

      const rx = L + halfW + 20;
      doc.rect(rx, y, halfW, 70).fill(LIGHT).stroke('#e2e8f0');
      doc.fontSize(8).fillColor(MID).font('Helvetica').text('PAY PERIOD', rx + 12, y + 10);
      doc.fontSize(13).fillColor(DARK).font('Helvetica-Bold').text(monthYear, rx + 12, y + 24);
      doc.fontSize(9).fillColor('#16a34a').font('Helvetica-Bold').text('Processed', rx + 12, y + 44);
      doc.fontSize(8).fillColor(MID).font('Helvetica').text(`Paid on ${fullDate}`, rx + 12, y + 58);

      // Divider
      y = 210;
      doc.moveTo(L, y).lineTo(R, y).stroke('#e2e8f0');

      // Summary cards
      y += 14;
      const cardW = (pageW - 100 - 20) / 3;
      [
        { label: 'BASE SALARY',     value: sal,        color: PRIMARY },
        { label: 'BONUS (5%)',       value: bonus,      color: GREEN   },
        { label: 'DEDUCTIONS (12%)', value: deductions, color: RED     },
      ].forEach((c, i) => {
        const cx = L + i * (cardW + 10);
        doc.rect(cx, y, cardW, 56).fill(LIGHT).stroke('#e2e8f0');
        doc.fontSize(8).fillColor(MID).font('Helvetica').text(c.label, cx + 10, y + 10);
        doc.fontSize(16).fillColor(c.color).font('Helvetica-Bold')
           .text(`$${c.value.toLocaleString()}`, cx + 10, y + 28, { width: cardW - 20 });
      });

      // Row helper — uses closure over y (let, so mutable)
      y += 74;
      const drawRow = (label, amount, color) => {
        doc.moveTo(L, y).lineTo(R, y).stroke('#f1f5f9');
        doc.fontSize(10).fillColor(color || DARK).font('Helvetica').text(label, L, y + 6);
        doc.fontSize(10).fillColor(color || DARK).font('Helvetica-Bold')
           .text(`$${amount.toLocaleString()}`, 0, y + 6, { align: 'right', width: pageW - L });
        y += 28;
      };

      // Earnings
      doc.fontSize(10).fillColor(PRIMARY).font('Helvetica-Bold').text('EARNINGS', L, y);
      y += 16;
      drawRow('Basic Salary', sal, DARK);
      drawRow('Performance Bonus (5%)', bonus, GREEN);

      // Deductions
      y += 6;
      doc.fontSize(10).fillColor(RED).font('Helvetica-Bold').text('DEDUCTIONS', L, y);
      y += 16;
      drawRow('Tax & Insurance (12%)', deductions, RED);

      // Net pay
      y += 10;
      doc.rect(L, y, pageW - 100, 60).fill('#f3f0ff').stroke('#c4b5fd');
      doc.fontSize(10).fillColor(MID).font('Helvetica').text('NET PAY', L + 16, y + 10);
      doc.fontSize(22).fillColor(PRIMARY).font('Helvetica-Bold')
         .text(`$${netPay.toLocaleString()}`, L + 16, y + 26);
      doc.fontSize(10).fillColor(MID).font('Helvetica')
         .text(`Paid on ${fullDate}`, 0, y + 32, { align: 'right', width: pageW - L });

      // Footer
      y += 80;
      doc.moveTo(L, y).lineTo(R, y).stroke('#e2e8f0');
      doc.fontSize(8).fillColor(MID).font('Helvetica')
         .text('This is a system-generated payslip. No signature required.',
               L, y + 10, { align: 'center', width: pageW - 100 });

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    const safeName  = (e.name || 'employee').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename  = `payslip-${safeName}-${monthYear.replace(/\s+/g, '_')}.pdf`;

    // Kill any compression middleware & send raw bytes
   res.removeHeader('Content-Encoding');
    res.removeHeader('Transfer-Encoding');
    res.removeHeader('TE');
    res.writeHead(200, {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      pdfBuffer.length,
      'Cache-Control':       'no-store',
    });
    res.end(pdfBuffer, 'binary');

  } catch (err) {
    console.error('getMyPayslipPDF error:', err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: 'Error generating PDF.' });
  }
};







module.exports = {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getPayroll,
  getAttendance, markAttendance, getAttendanceById, updateAttendance, deleteAttendance,
  getLeaves, applyLeave, updateLeave, deleteLeave,
  getHRStats,
  getUsers,
  getMyEmployee, getMyPayslip, getMyAttendance, getMyLeave, applyMyLeave,
  getHROthers, markMyAttendance, getMyPayslipPDF
};
