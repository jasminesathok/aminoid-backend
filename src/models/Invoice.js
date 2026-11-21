const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Rows come back from MySQL with `items` as a JSON column (already parsed by
// the driver in most configs, but some setups return it as a string) —
// normalize so callers always get a real array.
const parseRow = (row) => {
  if (!row) return row;
  if (typeof row.items === 'string') {
    try { row.items = JSON.parse(row.items); } catch { row.items = []; }
  }
  return row;
};
const parseRows = (rows) => (rows || []).map(parseRow);

// mysql2 throws "Bind parameters must not contain undefined" — callers
// (e.g. the payment endpoint) only pass a handful of fields at a time, so
// every other destructured value is `undefined`. Coerce to null so
// COALESCE(?, col) still works and the query never errors.
const n = (v) => (v === undefined ? null : v);

const Invoice = {
  list: async (eid) => {
    const [rows] = await db.query('SELECT * FROM invoices WHERE enterprise_id = ? ORDER BY issue_date DESC', [eid]);
    return [parseRows(rows)];
  },
  findById: async (id) => {
    const [rows] = await db.query('SELECT * FROM invoices WHERE id = ?', [id]);
    return [parseRows(rows)];
  },
  sumByStatus: (status) => db.query('SELECT COALESCE(SUM(amount), 0) AS t FROM invoices WHERE status IN (?)', [status]),
  countByStatus: (status, eid) => eid
    ? db.query('SELECT COUNT(*) AS c FROM invoices WHERE status = ? AND enterprise_id = ?', [status, eid])
    : db.query('SELECT COUNT(*) AS c FROM invoices WHERE status = ?', [status]),
  sumPaid: (eid) => eid
    ? db.query("SELECT COALESCE(SUM(amount), 0) AS t FROM invoices WHERE status = 'Paid' AND enterprise_id = ?", [eid])
    : db.query("SELECT COALESCE(SUM(amount), 0) AS t FROM invoices WHERE status = 'Paid'"),
  sumOutstanding: (eid) => eid
    ? db.query("SELECT COALESCE(SUM(amount), 0) AS t FROM invoices WHERE status IN ('Pending','Overdue','Partially Paid') AND enterprise_id = ?", [eid])
    : db.query("SELECT COALESCE(SUM(amount), 0) AS t FROM invoices WHERE status IN ('Pending','Overdue','Partially Paid')"),

  create: ({
    client, amount, dueDate, enterpriseId, status,
    invoiceNumber, projectName, issueDate,
    myName, myEmail, myAddress, myPhone,
    clientEmail, clientAddress,
    items, subtotal, discountPercent, discount, taxRate, taxAmount,
    paymentMethod, accountName, bankCode, accountNumber,
    amountPaid, notes,
  }) => {
    const id = uuidv4();
    const total = Number(amount) || 0;
    const paid = Number(amountPaid) || 0;
    const balanceDue = Math.max(total - paid, 0);
    return db.query(
      `INSERT INTO invoices (
        id, client, amount, status, issue_date, due_date, enterprise_id,
        invoice_number, project_name, my_name, my_email, my_address, my_phone,
        client_email, client_address, items, subtotal, discount_percent, discount,
        tax_rate, tax_amount, payment_method, account_name, bank_code, account_number,
        amount_paid, balance_due, notes
      ) VALUES (?,?,?,?,COALESCE(?,CURDATE()),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, client, total, status || 'Pending', issueDate || null, dueDate || null, enterpriseId || null,
        invoiceNumber || null, projectName || null, myName || null, myEmail || null, myAddress || null, myPhone || null,
        clientEmail || null, clientAddress || null, JSON.stringify(items || []), subtotal || 0, discountPercent || 0, discount || 0,
        taxRate || 0, taxAmount || 0, paymentMethod || null, accountName || null, bankCode || null, accountNumber || null,
        paid, balanceDue, notes || null,
      ]
    ).then(() => id);
  },

  update: (id, {
    client, amount, status, dueDate,
    invoiceNumber, projectName, issueDate,
    myName, myEmail, myAddress, myPhone,
    clientEmail, clientAddress,
    items, subtotal, discountPercent, discount, taxRate, taxAmount,
    paymentMethod, accountName, bankCode, accountNumber,
    amountPaid, balanceDue, paymentDate, notes,
  }) =>
    db.query(
      `UPDATE invoices SET
        client=COALESCE(?,client), amount=COALESCE(?,amount), status=COALESCE(?,status), due_date=COALESCE(?,due_date),
        invoice_number=COALESCE(?,invoice_number), project_name=COALESCE(?,project_name), issue_date=COALESCE(?,issue_date),
        my_name=COALESCE(?,my_name), my_email=COALESCE(?,my_email), my_address=COALESCE(?,my_address), my_phone=COALESCE(?,my_phone),
        client_email=COALESCE(?,client_email), client_address=COALESCE(?,client_address),
        items=COALESCE(?,items), subtotal=COALESCE(?,subtotal), discount_percent=COALESCE(?,discount_percent), discount=COALESCE(?,discount),
        tax_rate=COALESCE(?,tax_rate), tax_amount=COALESCE(?,tax_amount),
        payment_method=COALESCE(?,payment_method), account_name=COALESCE(?,account_name), bank_code=COALESCE(?,bank_code), account_number=COALESCE(?,account_number),
        amount_paid=COALESCE(?,amount_paid), balance_due=COALESCE(?,balance_due), payment_date=COALESCE(?,payment_date),
        notes=COALESCE(?,notes)
      WHERE id=?`,
      [
        n(client), n(amount), n(status), n(dueDate),
        n(invoiceNumber), n(projectName), n(issueDate),
        n(myName), n(myEmail), n(myAddress), n(myPhone),
        n(clientEmail), n(clientAddress),
        items ? JSON.stringify(items) : null, n(subtotal), n(discountPercent), n(discount),
        n(taxRate), n(taxAmount),
        n(paymentMethod), n(accountName), n(bankCode), n(accountNumber),
        n(amountPaid), n(balanceDue), n(paymentDate),
        n(notes),
        id,
      ]
    ),

  delete: (id) => db.query('DELETE FROM invoices WHERE id = ?', [id]),
};

module.exports = Invoice;