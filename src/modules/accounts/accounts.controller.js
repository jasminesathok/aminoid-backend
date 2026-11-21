const Invoice     = require('../../models/Invoice');
const Expense     = require('../../models/Expense');
const Transaction = require('../../models/Transaction');
const db          = require('../../config/db');

// FIX: was `_req` — req.enterpriseId was undefined, causing 500 errors
const getInvoices = async (req, res) => {
  try {
    const [r] = await Invoice.list(req.enterpriseId);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getInvoices error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createInvoice = async (req, res) => {
  const {
    client, amount, dueDate, status,
    invoiceNumber, projectName, issueDate,
    myName, myEmail, myAddress, myPhone,
    clientEmail, clientAddress,
    items, subtotal, discountPercent, discount, taxRate, taxAmount, tax_rate, tax_amount,
    paymentMethod, payment_method, accountName, account_name, bankCode, bank_code, accountNumber, account_number,
    amountPaid, notes,
  } = req.body;
  if (!client || !amount) return res.status(400).json({ success: false, message: 'Client and amount required' });
  try {
    const id = await Invoice.create({
      client, amount, dueDate, status, enterpriseId: req.enterpriseId,
      invoiceNumber, projectName, issueDate,
      myName, myEmail, myAddress, myPhone,
      clientEmail, clientAddress,
      items, subtotal, discountPercent, discount,
      taxRate: taxRate ?? tax_rate, taxAmount: taxAmount ?? tax_amount,
      paymentMethod: paymentMethod ?? payment_method,
      accountName: accountName ?? account_name,
      bankCode: bankCode ?? bank_code,
      accountNumber: accountNumber ?? account_number,
      amountPaid, notes,
    });
    const [r] = await Invoice.findById(id);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('createInvoice error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateInvoice = async (req, res) => {
  const {
    client, amount, status, dueDate,
    invoiceNumber, projectName, issueDate,
    myName, myEmail, myAddress, myPhone,
    clientEmail, clientAddress,
    items, subtotal, discountPercent, discount, taxRate, taxAmount, tax_rate, tax_amount,
    paymentMethod, payment_method, accountName, account_name, bankCode, bank_code, accountNumber, account_number,
    amountPaid, notes,
  } = req.body;
  try {
    // Auto-derive balance due & status when an amount (or amount paid) changes,
    // unless the caller explicitly set a status.
    let resolvedStatus = status;
    let balanceDue;
    if (amount !== undefined || amountPaid !== undefined) {
      const [existingRows] = await Invoice.findById(req.params.id);
      const existing = existingRows[0] || {};
      const total = amount !== undefined ? Number(amount) : Number(existing.amount) || 0;
      const paid = amountPaid !== undefined ? Number(amountPaid) : Number(existing.amount_paid) || 0;
      balanceDue = Math.max(total - paid, 0);
      if (!resolvedStatus) {
        if (paid <= 0) resolvedStatus = existing.status === 'Overdue' ? 'Overdue' : 'Pending';
        else if (balanceDue <= 0) resolvedStatus = 'Paid';
        else resolvedStatus = 'Partially Paid';
      }
    }

    await Invoice.update(req.params.id, {
      client, amount, status: resolvedStatus, dueDate,
      invoiceNumber, projectName, issueDate,
      myName, myEmail, myAddress, myPhone,
      clientEmail, clientAddress,
      items, subtotal, discountPercent, discount,
      taxRate: taxRate ?? tax_rate, taxAmount: taxAmount ?? tax_amount,
      paymentMethod: paymentMethod ?? payment_method,
      accountName: accountName ?? account_name,
      bankCode: bankCode ?? bank_code,
      accountNumber: accountNumber ?? account_number,
      amountPaid, balanceDue, notes,
    });
    const [r] = await Invoice.findById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateInvoice error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Lightweight endpoint dedicated to recording a payment (full or partial)
// against an invoice — used by the "Record Payment" action in the UI.
// Status is derived automatically: 0 paid -> Pending/Overdue, partial -> 'Partially Paid', full -> 'Paid'.
const recordInvoicePayment = async (req, res) => {
  try {
    const { amountPaid, paymentDate } = req.body;
    if (amountPaid === undefined || amountPaid === null || isNaN(Number(amountPaid))) {
      return res.status(400).json({ success: false, message: 'amountPaid is required' });
    }
    const [existingRows] = await Invoice.findById(req.params.id);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const total = Number(existing.amount) || 0;
    const paid = Math.max(Number(amountPaid), 0);
    const balanceDue = Math.max(total - paid, 0);
    let resolvedStatus;
    if (paid <= 0) resolvedStatus = 'Pending';
    else if (balanceDue <= 0) resolvedStatus = 'Paid';
    else resolvedStatus = 'Partially Paid';

    await Invoice.update(req.params.id, {
      amountPaid: paid,
      balanceDue,
      status: resolvedStatus,
      paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
    });
    const [r] = await Invoice.findById(req.params.id);
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('recordInvoicePayment error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const [result] = await Invoice.delete(req.params.id);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    console.error('deleteInvoice error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// FIX: was `_req`
const getExpenses = async (req, res) => {
  try {
    const [r] = await Expense.list(req.enterpriseId);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getExpenses error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createExpense = async (req, res) => {
  const { category, amount, description, date } = req.body;
  if (!category || !amount) return res.status(400).json({ success: false, message: 'Category and amount required' });
  try {
    const id = await Expense.create({ category, amount, description, date, enterpriseId: req.enterpriseId });
    const [r] = await Expense.findById(id);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('createExpense error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateExpense = async (req, res) => {
  const { category, amount, description, status, date } = req.body;
  try {
    await Expense.update(req.params.id, { category, amount, description, status, date });
    const [r] = await Expense.findById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateExpense error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const [result] = await Expense.delete(req.params.id);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    console.error('deleteExpense error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// FIX: was `_req`
const getTransactions = async (req, res) => {
  try {
    const [r] = await Transaction.list(req.enterpriseId);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('getTransactions error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM transactions WHERE id=?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('getTransactionById error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { type, amount, description, party, date, category, method, account_name, reference_id, time, attachment_path, status, tags, notes } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    await db.query(
      "INSERT INTO transactions (id, type, amount, description, party, date, category, method, account_name, reference_id, time, attachment_path, status, tags, notes, enterprise_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [id, type, amount, description || null, party || null, date || new Date(), category || null, method || null, account_name || null, reference_id || null, time || null, attachment_path || null, status || 'Completed', tags || null, notes || null, req.enterpriseId]
    );
    const [[row]] = await db.query('SELECT * FROM transactions WHERE id=?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error('createTransaction error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { type, amount, description, party, date, category, method, account_name, reference_id, time, attachment_path, status, tags, notes } = req.body;
    await db.query(
      'UPDATE transactions SET type=COALESCE(?,type), amount=COALESCE(?,amount), description=COALESCE(?,description), party=COALESCE(?,party), date=COALESCE(?,date), category=COALESCE(?,category), method=COALESCE(?,method), account_name=COALESCE(?,account_name), reference_id=COALESCE(?,reference_id), time=COALESCE(?,time), attachment_path=COALESCE(?,attachment_path), status=COALESCE(?,status), tags=COALESCE(?,tags), notes=COALESCE(?,notes) WHERE id=?',
      [type, amount, description, party, date, category, method, account_name, reference_id, time, attachment_path, status, tags, notes, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM transactions WHERE id=?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('updateTransaction error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM transactions WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    console.error('deleteTransaction error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const uploadTransactionAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const file_path = '/uploads/transactions/' + req.file.filename;
    const { id } = req.params;
    await db.query('UPDATE transactions SET attachment_path=? WHERE id=?', [file_path, id]);
    res.json({ success: true, file_path });
  } catch (err) {
    console.error('uploadTransactionAttachment error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getOverview = async (req, res) => {
  try {
    const eid = req.enterpriseId;

    // Revenue = actually collected amount across sales invoices (amount - due_amount),
    // so partially paid invoices count only their paid portion.
    const [[rev]] = await db.query(
      "SELECT COALESCE(SUM(amount - due_amount), 0) AS total FROM sales_invoices WHERE enterprise_id = ?",
      [eid]
    );
    const [[exp]] = await db.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE enterprise_id = ?",
      [eid]
    );
    const [[out]] = await db.query(
      "SELECT COALESCE(SUM(due_amount), 0) AS total FROM sales_invoices WHERE enterprise_id = ?",
      [eid]
    );
    const [[paid]] = await db.query(
      "SELECT COUNT(*) AS c FROM sales_invoices WHERE status = 'Paid' AND enterprise_id = ?",
      [eid]
    );
    const [[overdue]] = await db.query(
      "SELECT COUNT(*) AS c FROM sales_invoices WHERE status = 'Overdue' AND enterprise_id = ?",
      [eid]
    );

    res.json({ success: true, data: {
      totalRevenue: Number(rev.total), totalExpenses: Number(exp.total),
      netProfit: Number(rev.total) - Number(exp.total),
      outstanding: Number(out.total), paidInvoices: paid.c, overdueInvoices: overdue.c,
    }});
  } catch (err) {
    console.error('getOverview error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const eid = req.enterpriseId;
    const [revRows] = await db.query(`
      SELECT MONTH(issue_date) AS m, COALESCE(SUM(amount), 0) AS amount
      FROM invoices
      WHERE status = 'Paid' AND YEAR(issue_date) = YEAR(CURDATE()) AND enterprise_id = ?
      GROUP BY m ORDER BY m
    `, [eid]);
    const [expRows] = await db.query(`
      SELECT MONTH(date) AS m, COALESCE(SUM(amount), 0) AS amount
      FROM expenses
      WHERE YEAR(date) = YEAR(CURDATE()) AND enterprise_id = ?
      GROUP BY m ORDER BY m
    `, [eid]);
    const [catRows] = await db.query(`
      SELECT category, COALESCE(SUM(amount), 0) AS total
      FROM expenses WHERE enterprise_id = ? GROUP BY category ORDER BY total DESC
    `, [eid]);
    const revByMonth = Array.from({ length: 12 }, (_, i) => {
      const row = revRows.find(r => r.m === i + 1);
      return row ? Number(row.amount) : 0;
    });
    const expByMonth = Array.from({ length: 12 }, (_, i) => {
      const row = expRows.find(r => r.m === i + 1);
      return row ? Number(row.amount) : 0;
    });
    const categories = catRows.map(r => ({ name: r.category, total: Number(r.total) }));
    res.json({ success: true, data: { revByMonth, expByMonth, categories } });
  } catch (err) {
    console.error('getMonthlyReport error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getInvoices, createInvoice, updateInvoice, recordInvoicePayment, deleteInvoice,
  getExpenses, createExpense, updateExpense, deleteExpense,
  getTransactions, getTransactionById, createTransaction, updateTransaction, deleteTransaction, uploadTransactionAttachment,
  getOverview, getMonthlyReport
};