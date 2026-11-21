const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const { logActivity } = require('../../utils/activity');

// ─── Overview ─────────────────────────────────────────────────────────────────
exports.getSalesOverview = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
const eid = req.enterpriseId;
const [[{ accounts }]]   = await db.query(`SELECT COUNT(*) AS accounts FROM sales_accounts${isSA ? '' : ' WHERE enterprise_id = ?'}`, isSA ? [] : [eid]);
const [[{ contacts }]]   = await db.query(`SELECT COUNT(*) AS contacts FROM sales_contacts${isSA ? '' : ' WHERE enterprise_id = ?'}`, isSA ? [] : [eid]);
const [[{ totalValue }]] = await db.query(`SELECT COALESCE(SUM(value),0) AS totalValue FROM sales_deals${isSA ? '' : ' WHERE enterprise_id = ?'}`, isSA ? [] : [eid]);
const [[{ won }]]        = await db.query(`SELECT COUNT(*) AS won FROM sales_deals WHERE stage='Closed Won'${isSA ? '' : ' AND enterprise_id = ?'}`, isSA ? [] : [eid]);
const [[{ lost }]]       = await db.query(`SELECT COUNT(*) AS lost FROM sales_deals WHERE stage='Closed Lost'${isSA ? '' : ' AND enterprise_id = ?'}`, isSA ? [] : [eid]);
    
    const winRate = (Number(won) + Number(lost)) > 0
      ? Math.round((Number(won) / (Number(won) + Number(lost))) * 100) : 0;

    const [pipeline] = await db.query(`
      SELECT stage, COUNT(*) AS count, COALESCE(SUM(value),0) AS value
      FROM sales_deals
      WHERE stage NOT IN ('Closed Won','Closed Lost')${isSA ? '' : ' AND enterprise_id = ?'}
      GROUP BY stage
    `, [eid]);

    const [recentDeals] = await db.query(`
      SELECT d.id, d.name, d.stage, d.value, d.owner, d.probability, a.name AS account_name
      FROM sales_deals d
      LEFT JOIN sales_accounts a ON d.account_id = a.id
      ${isSA ? '' : 'WHERE d.enterprise_id = ?'}
      ORDER BY d.created_at DESC LIMIT 5
    `, [eid]);

    res.json({ success: true, data: {
      accounts: Number(accounts), contacts: Number(contacts),
      totalValue: Number(totalValue), won: Number(won), lost: Number(lost),
      winRate, pipeline, recentDeals,
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Accounts ─────────────────────────────────────────────────────────────────
exports.getAccounts = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
const [rows] = await db.query(
  isSA ? 'SELECT * FROM sales_accounts ORDER BY created_at DESC'
       : 'SELECT * FROM sales_accounts WHERE enterprise_id = ? ORDER BY created_at DESC',
  isSA ? [] : [req.enterpriseId]
);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createAccount = async (req, res) => {
  try {
    const {
      name,
      industry,
      status,
      revenue,
      website,
      phone,
      owner,
      company_email,
      companyEmail,
      company_size,
      companySize,
      address,
      account_owner,
      accountOwner,
      account_type,
      accountType,
      lead_source,
      leadSource,
      currency,
      tax_id,
      taxId,
      payment_terms,
      paymentTerms,
      description,
      social_links,
      socialLinks,
      tags,
      attachments,
      notes,
    } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const id = uuidv4();
    await db.query(
      `INSERT INTO sales_accounts (
        id, name, industry, status, revenue, website, phone, owner,
        company_email, company_size, address, account_owner, account_type,
        lead_source, currency, tax_id, payment_terms, description,
        social_links, tags, attachments, notes, enterprise_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        name,
        industry || 'Other',
        status || 'Prospect',
        revenue || 0,
        website || null,
        phone || null,
        owner || accountOwner || null,
        company_email || companyEmail || null,
        company_size || companySize || null,
        address || null,
        account_owner || accountOwner || null,
        account_type || accountType || null,
        lead_source || leadSource || null,
        currency || 'USD',
        tax_id || taxId || null,
        payment_terms || paymentTerms || null,
        description || null,
        social_links || socialLinks || null,
        tags || null,
        attachments ? JSON.stringify(attachments) : null,
        notes || null,
        req.enterpriseId,
      ]
    );
    const [[row]] = await db.query('SELECT * FROM sales_accounts WHERE id=?', [id]);
    await logActivity(req.user?.id, 'account', `New account "${name}" added`, 'Sales', req.enterpriseId);
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateAccount = async (req, res) => {
  try {
    const {
      name,
      industry,
      status,
      revenue,
      website,
      phone,
      owner,
      company_email,
      companyEmail,
      company_size,
      companySize,
      address,
      account_owner,
      accountOwner,
      account_type,
      accountType,
      lead_source,
      leadSource,
      currency,
      tax_id,
      taxId,
      payment_terms,
      paymentTerms,
      description,
      social_links,
      socialLinks,
      tags,
      attachments,
      notes,
    } = req.body;

    await db.query(
      `UPDATE sales_accounts SET
        name=COALESCE(?,name), industry=COALESCE(?,industry), status=COALESCE(?,status),
        revenue=COALESCE(?,revenue), website=COALESCE(?,website),
        phone=COALESCE(?,phone), owner=COALESCE(?,owner),
        company_email=COALESCE(?,company_email), company_size=COALESCE(?,company_size),
        address=COALESCE(?,address), account_owner=COALESCE(?,account_owner),
        account_type=COALESCE(?,account_type), lead_source=COALESCE(?,lead_source),
        currency=COALESCE(?,currency), tax_id=COALESCE(?,tax_id),
        payment_terms=COALESCE(?,payment_terms), description=COALESCE(?,description),
        social_links=COALESCE(?,social_links), tags=COALESCE(?,tags),
        attachments=COALESCE(?,attachments), notes=COALESCE(?,notes)
       WHERE id=?`,
      [
        name,
        industry,
        status,
        revenue,
        website,
        phone,
        owner || accountOwner,
        company_email || companyEmail,
        company_size || companySize,
        address,
        account_owner || accountOwner,
        account_type || accountType,
        lead_source || leadSource,
        currency,
        tax_id || taxId,
        payment_terms || paymentTerms,
        description,
        social_links || socialLinks,
        tags,
        attachments ? JSON.stringify(attachments) : null,
        notes,
        req.params.id,
      ]
    );
    const [[row]] = await db.query('SELECT * FROM sales_accounts WHERE id=?', [req.params.id]);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteAccount = async (req, res) => {
  try {
    await db.query('DELETE FROM sales_accounts WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Contacts ─────────────────────────────────────────────────────────────────
exports.getContacts = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    const [rows] = await db.query(
      `SELECT c.*, a.name AS account_name
       FROM sales_contacts c
       LEFT JOIN sales_accounts a ON c.account_id = a.id
       ${isSA ? '' : 'WHERE c.enterprise_id = ?'}
       ORDER BY c.created_at DESC`,
      isSA ? [] : [req.enterpriseId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createContact = async (req, res) => {
  try {
    const { name, email, phone, title, account_id, status } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email are required' });
    const id = uuidv4();
    await db.query(
      'INSERT INTO sales_contacts (id,account_id,name,email,phone,title,status,enterprise_id) VALUES (?,?,?,?,?,?,?,?)',
      [id, account_id||null, name, email, phone||null, title||null, status||'Active', req.enterpriseId]
    );
    const [[row]] = await db.query(
      'SELECT c.*, a.name AS account_name FROM sales_contacts c LEFT JOIN sales_accounts a ON c.account_id=a.id WHERE c.id=?',
      [id]
    );
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateContact = async (req, res) => {
  try {
    const { name, email, phone, title, account_id, status } = req.body;
    await db.query(
      `UPDATE sales_contacts SET
        name=COALESCE(?,name), email=COALESCE(?,email), phone=COALESCE(?,phone),
        title=COALESCE(?,title), account_id=COALESCE(?,account_id), status=COALESCE(?,status)
       WHERE id=?`,
      [name, email, phone, title, account_id, status, req.params.id]
    );
    const [[row]] = await db.query(
      'SELECT c.*, a.name AS account_name FROM sales_contacts c LEFT JOIN sales_accounts a ON c.account_id=a.id WHERE c.id=?',
      [req.params.id]
    );
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteContact = async (req, res) => {
  try {
    await db.query('DELETE FROM sales_contacts WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Deals ────────────────────────────────────────────────────────────────────
exports.getDeals = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    const [rows] = await db.query(
      `SELECT d.*, a.name AS account_name
       FROM sales_deals d
       LEFT JOIN sales_accounts a ON d.account_id = a.id
       ${isSA ? '' : 'WHERE d.enterprise_id = ?'}
       ORDER BY d.created_at DESC`,
      isSA ? [] : [req.enterpriseId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createDeal = async (req, res) => {
  try {
    const { name, account_id, stage, value, owner, close_date, probability } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Deal name is required' });
    const id = uuidv4();
    await db.query(
      'INSERT INTO sales_deals (id,account_id,name,stage,value,owner,close_date,probability,enterprise_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, account_id||null, name, stage||'Prospecting', value||0, owner||null, close_date||null, probability||0, req.enterpriseId]
    );
    const [[row]] = await db.query(
      'SELECT d.*, a.name AS account_name FROM sales_deals d LEFT JOIN sales_accounts a ON d.account_id=a.id WHERE d.id=?',
      [id]
    );
    await logActivity(req.user?.id, 'deal', `New deal "${name}" created`, 'Sales', req.enterpriseId);
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateDeal = async (req, res) => {
  try {
    const { name, account_id, stage, value, owner, close_date, probability } = req.body;
    await db.query(
      `UPDATE sales_deals SET
        name=COALESCE(?,name), account_id=COALESCE(?,account_id), stage=COALESCE(?,stage),
        value=COALESCE(?,value), owner=COALESCE(?,owner),
        close_date=COALESCE(?,close_date), probability=COALESCE(?,probability)
       WHERE id=?`,
      [name, account_id, stage, value, owner, close_date, probability, req.params.id]
    );
    const [[row]] = await db.query(
      'SELECT d.*, a.name AS account_name FROM sales_deals d LEFT JOIN sales_accounts a ON d.account_id=a.id WHERE d.id=?',
      [req.params.id]
    );
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteDeal = async (req, res) => {
  try {
    await db.query('DELETE FROM sales_deals WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Proposals ────────────────────────────────────────────────────────────────
exports.getProposals = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT p.*, a.name AS account_name FROM sales_proposals p LEFT JOIN sales_accounts a ON p.account_id = a.id WHERE p.enterprise_id = ? ORDER BY p.created_at DESC', [req.enterpriseId]);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createProposal = async (req, res) => {
  try {
    const { title, account_id, status, amount, date, expiry_date } = req.body;
    const id = uuidv4();
    await db.query('INSERT INTO sales_proposals (id, account_id, title, status, amount, date, expiry_date, enterprise_id) VALUES (?,?,?,?,?,?,?,?)',
      [id, account_id, title, status||'Draft', amount||0, date||new Date(), expiry_date, req.enterpriseId]);
    const [[row]] = await db.query('SELECT * FROM sales_proposals WHERE id=?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteProposal = async (req, res) => {
  try {
    await db.query('DELETE FROM sales_proposals WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateProposal = async (req, res) => {
  try {
    const { title, account_id, status, amount, date, expiry_date } = req.body;
    await db.query(
      'UPDATE sales_proposals SET title=COALESCE(?,title), account_id=COALESCE(?,account_id), status=COALESCE(?,status), amount=COALESCE(?,amount), date=COALESCE(?,date), expiry_date=COALESCE(?,expiry_date) WHERE id=?',
      [title, account_id, status, amount, date, expiry_date, req.params.id]
    );
    const [[row]] = await db.query('SELECT p.*, a.name AS account_name FROM sales_proposals p LEFT JOIN sales_accounts a ON p.account_id = a.id WHERE p.id=?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Proposal not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Estimates ────────────────────────────────────────────────────────────────
exports.getEstimates = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT e.*, a.name AS account_name FROM sales_estimates e LEFT JOIN sales_accounts a ON e.account_id = a.id WHERE e.enterprise_id = ? ORDER BY e.created_at DESC', [req.enterpriseId]);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createEstimate = async (req, res) => {
  try {
    const { estimate_no, account_id, status, amount, date, expiry_date, billing_address, currency, notes, items } = req.body;
    const id = uuidv4();
    await db.query('INSERT INTO sales_estimates (id, account_id, estimate_no, status, amount, date, expiry_date, billing_address, currency, notes, enterprise_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, account_id, estimate_no, status||'Draft', amount||0, date||new Date(), expiry_date, billing_address, currency||'USD', notes, req.enterpriseId]);
      
    if (items && Array.isArray(items)) {
      for (const it of items) {
        await db.query(
          'INSERT INTO sales_estimate_items (id, estimate_id, item_name, description, quantity, rate, discount, tax_rate, amount) VALUES (?,?,?,?,?,?,?,?,?)',
          [uuidv4(), id, it.item_name, it.description, it.quantity, it.rate, it.discount||0, it.tax_rate||0, it.amount]
        );
      }
    }

    const [[row]] = await db.query('SELECT * FROM sales_estimates WHERE id=?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteEstimate = async (req, res) => {
  try {
    await db.query('DELETE FROM sales_estimates WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getEstimateById = async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT e.*, a.name AS account_name FROM sales_estimates e LEFT JOIN sales_accounts a ON e.account_id = a.id WHERE e.id=?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Estimate not found' });
    
    const [items] = await db.query('SELECT * FROM sales_estimate_items WHERE estimate_id=?', [req.params.id]);
    row.items = items;
    
    const [attachments] = await db.query('SELECT * FROM sales_estimate_attachments WHERE estimate_id=?', [req.params.id]);
    row.attachments = attachments;

    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateEstimate = async (req, res) => {
  try {
    const { estimate_no, account_id, status, amount, date, expiry_date, billing_address, currency, notes, items } = req.body;
    await db.query(
      'UPDATE sales_estimates SET estimate_no=COALESCE(?,estimate_no), account_id=COALESCE(?,account_id), status=COALESCE(?,status), amount=COALESCE(?,amount), date=COALESCE(?,date), expiry_date=COALESCE(?,expiry_date), billing_address=COALESCE(?,billing_address), currency=COALESCE(?,currency), notes=COALESCE(?,notes) WHERE id=?',
      [estimate_no, account_id, status, amount, date, expiry_date, billing_address, currency, notes, req.params.id]
    );
    
    if (items && Array.isArray(items)) {
      await db.query('DELETE FROM sales_estimate_items WHERE estimate_id=?', [req.params.id]);
      for (const it of items) {
        await db.query(
          'INSERT INTO sales_estimate_items (id, estimate_id, item_name, description, quantity, rate, discount, tax_rate, amount) VALUES (?,?,?,?,?,?,?,?,?)',
          [uuidv4(), req.params.id, it.item_name, it.description, it.quantity, it.rate, it.discount||0, it.tax_rate||0, it.amount]
        );
      }
    }

    const [[row]] = await db.query(
      'SELECT e.*, a.name AS account_name FROM sales_estimates e LEFT JOIN sales_accounts a ON e.account_id = a.id WHERE e.id=?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Estimate not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.uploadEstimateAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const id = uuidv4();
    const filePath = '/uploads/invoices/' + req.file.filename; // reusing invoices folder for simplicity or should be uploads/estimates? Invoices folder is fine since we serve it statically
    await db.query(
      'INSERT INTO sales_estimate_attachments (id, estimate_id, file_name, file_path, file_type, file_size) VALUES (?,?,?,?,?,?)',
      [id, req.params.id, req.file.originalname, filePath, req.file.mimetype, req.file.size]
    );
    res.status(201).json({ success: true, message: 'File uploaded' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteEstimateAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const [[att]] = await db.query('SELECT * FROM sales_estimate_attachments WHERE id=? AND estimate_id=?', [attachmentId, id]);
    if (!att) return res.status(404).json({ success: false, message: 'Attachment not found' });
    
    // Optional: unlink file from disk here using fs.unlink
    
    await db.query('DELETE FROM sales_estimate_attachments WHERE id=?', [attachmentId]);
    res.json({ success: true, message: 'Attachment deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Invoices ─────────────────────────────────────────────────────────────────
exports.getInvoices = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    const [rows] = await db.query(
      `SELECT i.*, a.name AS account_name
       FROM sales_invoices i
       LEFT JOIN sales_accounts a ON i.account_id = a.id
       ${isSA ? '' : 'WHERE i.enterprise_id = ?'}
       ORDER BY i.created_at DESC`,
      isSA ? [] : [req.enterpriseId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createInvoice = async (req, res) => {
  try {
    const { invoice_no, account_id, status, amount, due_amount, date, due_date, billing_address, payment_terms, sales_person, notes, currency, items, discount, tax_rate, tax_amount, subtotal, payment_method, bank_account_name, bank_code, account_number } = req.body;
    const id = uuidv4();
    await db.query('INSERT INTO sales_invoices (id, account_id, invoice_no, status, amount, due_amount, date, due_date, enterprise_id, billing_address, payment_terms, sales_person, notes, currency, discount, tax_rate, tax_amount, subtotal, payment_method, bank_account_name, bank_code, account_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, account_id, invoice_no, status||'Unpaid', amount||0, due_amount||amount||0, date||new Date(), due_date, req.enterpriseId, billing_address, payment_terms, sales_person, notes, currency||'USD', discount||0, tax_rate||0, tax_amount||0, subtotal||0, payment_method||null, bank_account_name||null, bank_code||null, account_number||null]);
    
    if (items && Array.isArray(items)) {
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        await db.query('INSERT INTO sales_invoice_items (id, invoice_id, item_name, description, quantity, rate, amount, discount, taxRate, unit, item_code, hsn, sku, item_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [uuidv4(), id, item.item_name, item.description, item.quantity||1, item.rate||0, item.amount||0, item.discount||0, item.taxRate||0, item.unit||'', item.item_code||'', item.hsn||'', item.sku||'', idx]);
      }
    }

    const [[row]] = await db.query('SELECT * FROM sales_invoices WHERE id=?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteInvoice = async (req, res) => {
  try {
    await db.query('DELETE FROM sales_invoices WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT i.*, a.name AS account_name FROM sales_invoices i LEFT JOIN sales_accounts a ON i.account_id = a.id WHERE i.id=?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const [items] = await db.query('SELECT * FROM sales_invoice_items WHERE invoice_id=? ORDER BY item_order ASC', [req.params.id]);
    const [attachments] = await db.query('SELECT * FROM sales_invoice_attachments WHERE invoice_id=?', [req.params.id]);

    row.items = items;
    row.attachments = attachments;

    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateInvoice = async (req, res) => {
  try {
    const { invoice_no, account_id, status, amount, due_amount, date, due_date, billing_address, payment_terms, sales_person, notes, currency, items, discount, tax_rate, tax_amount, subtotal, payment_method, bank_account_name, bank_code, account_number } = req.body;
    await db.query(
      'UPDATE sales_invoices SET invoice_no=COALESCE(?,invoice_no), account_id=COALESCE(?,account_id), status=COALESCE(?,status), amount=COALESCE(?,amount), due_amount=COALESCE(?,due_amount), date=COALESCE(?,date), due_date=COALESCE(?,due_date), billing_address=COALESCE(?,billing_address), payment_terms=COALESCE(?,payment_terms), sales_person=COALESCE(?,sales_person), notes=COALESCE(?,notes), currency=COALESCE(?,currency), discount=COALESCE(?,discount), tax_rate=COALESCE(?,tax_rate), tax_amount=COALESCE(?,tax_amount), subtotal=COALESCE(?,subtotal), payment_method=COALESCE(?,payment_method), bank_account_name=COALESCE(?,bank_account_name), bank_code=COALESCE(?,bank_code), account_number=COALESCE(?,account_number) WHERE id=?',
      [invoice_no, account_id, status, amount, due_amount, date, due_date, billing_address, payment_terms, sales_person, notes, currency, discount, tax_rate, tax_amount, subtotal, payment_method, bank_account_name, bank_code, account_number, req.params.id]
    );

    if (items && Array.isArray(items)) {
      await db.query('DELETE FROM sales_invoice_items WHERE invoice_id=?', [req.params.id]);
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        await db.query('INSERT INTO sales_invoice_items (id, invoice_id, item_name, description, quantity, rate, amount, discount, taxRate, unit, item_code, hsn, sku, item_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [uuidv4(), req.params.id, item.item_name, item.description, item.quantity||1, item.rate||0, item.amount||0, item.discount||0, item.taxRate||0, item.unit||'', item.item_code||'', item.hsn||'', item.sku||'', idx]);
      }
    }

    const [[row]] = await db.query(
      'SELECT i.*, a.name AS account_name FROM sales_invoices i LEFT JOIN sales_accounts a ON i.account_id = a.id WHERE i.id=?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const fs = require('fs');
const path = require('path');

exports.uploadInvoiceAttachment = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const file_name = req.file.originalname;
    const file_path = '/uploads/invoices/' + req.file.filename;
    const file_type = req.file.mimetype;
    const file_size = req.file.size;
    
    const id = uuidv4();
    await db.query('INSERT INTO sales_invoice_attachments (id, invoice_id, file_name, file_path, file_type, file_size) VALUES (?,?,?,?,?,?)',
      [id, invoiceId, file_name, file_path, file_type, file_size]);
      
    const [[attachment]] = await db.query('SELECT * FROM sales_invoice_attachments WHERE id=?', [id]);
    res.status(201).json({ success: true, data: attachment });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteInvoiceAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const [[attachment]] = await db.query('SELECT file_path FROM sales_invoice_attachments WHERE id=? AND invoice_id=?', [attachmentId, id]);
    if (attachment) {
      const fullPath = path.join(__dirname, '../../../', attachment.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    await db.query('DELETE FROM sales_invoice_attachments WHERE id=? AND invoice_id=?', [attachmentId, id]);
    res.json({ success: true, message: 'Attachment deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.downloadInvoicePdf = async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT i.*, a.name AS account_name FROM sales_invoices i LEFT JOIN sales_accounts a ON i.account_id = a.id WHERE i.id=?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Invoice not found' });
    // Return invoice data as JSON for frontend-side PDF generation
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Payments ─────────────────────────────────────────────────────────────────
exports.getPayments = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    const [rows] = await db.query(
      `SELECT p.*, i.invoice_no, a.name AS account_name
       FROM sales_payments p
       LEFT JOIN sales_invoices i ON p.invoice_id = i.id
       LEFT JOIN sales_accounts a ON p.account_id = a.id
       ${isSA ? '' : 'WHERE p.enterprise_id = ?'}
       ORDER BY p.created_at DESC`,
      isSA ? [] : [req.enterpriseId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createPayment = async (req, res) => {
  try {
    const { invoice_id, amount, method, date, transaction_id, account_id, payment_for, deposit_to, notes, status } = req.body;
    const id = uuidv4();
    await db.query('INSERT INTO sales_payments (id, invoice_id, amount, method, date, transaction_id, account_id, payment_for, deposit_to, notes, status, enterprise_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, invoice_id || null, amount, method||'Bank Transfer', date||new Date(), transaction_id, account_id || null, payment_for || 'Invoice', deposit_to, notes, status || 'Completed', req.enterpriseId]);
    const [[row]] = await db.query('SELECT * FROM sales_payments WHERE id=?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deletePayment = async (req, res) => {
  try {
    await db.query('DELETE FROM sales_payments WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getPaymentById = async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT p.*, i.invoice_no, a.name AS account_name FROM sales_payments p LEFT JOIN sales_invoices i ON p.invoice_id = i.id LEFT JOIN sales_accounts a ON p.account_id = a.id WHERE p.id=?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updatePayment = async (req, res) => {
  try {
    const { invoice_id, amount, method, date, transaction_id, account_id, payment_for, deposit_to, notes, status } = req.body;
    await db.query(
      'UPDATE sales_payments SET invoice_id=COALESCE(?,invoice_id), amount=COALESCE(?,amount), method=COALESCE(?,method), date=COALESCE(?,date), transaction_id=COALESCE(?,transaction_id), account_id=COALESCE(?,account_id), payment_for=COALESCE(?,payment_for), deposit_to=COALESCE(?,deposit_to), notes=COALESCE(?,notes), status=COALESCE(?,status) WHERE id=?',
      [invoice_id || null, amount, method, date, transaction_id, account_id || null, payment_for, deposit_to, notes, status, req.params.id]
    );
    const [[row]] = await db.query(
      'SELECT p.*, i.invoice_no, a.name AS account_name FROM sales_payments p LEFT JOIN sales_invoices i ON p.invoice_id = i.id LEFT JOIN sales_accounts a ON p.account_id = a.id WHERE p.id=?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Credit Notes ─────────────────────────────────────────────────────────────
exports.getCreditNotes = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    const [rows] = await db.query(
      `SELECT c.*, a.name AS account_name, i.invoice_no
       FROM sales_credit_notes c
       LEFT JOIN sales_accounts a ON c.account_id = a.id
       LEFT JOIN sales_invoices i ON c.invoice_id = i.id
       ${isSA ? '' : 'WHERE c.enterprise_id = ?'}
       ORDER BY c.created_at DESC`,
      isSA ? [] : [req.enterpriseId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createCreditNote = async (req, res) => {
  try {
    const { note_no, account_id, amount, date, reason, invoice_id, credit_type, notes } = req.body;
    const id = uuidv4();
    await db.query('INSERT INTO sales_credit_notes (id, account_id, note_no, amount, date, reason, invoice_id, credit_type, notes, enterprise_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, account_id, note_no, amount||0, date||new Date(), reason, invoice_id, credit_type, notes, req.enterpriseId]);
    const [[row]] = await db.query('SELECT * FROM sales_credit_notes WHERE id=?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteCreditNote = async (req, res) => {
  try {
    await db.query('DELETE FROM sales_credit_notes WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getCreditNoteById = async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT cn.*, a.name AS account_name, i.invoice_no FROM sales_credit_notes cn LEFT JOIN sales_accounts a ON cn.account_id = a.id LEFT JOIN sales_invoices i ON cn.invoice_id = i.id WHERE cn.id=?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Credit note not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateCreditNote = async (req, res) => {
  try {
    const { note_no, account_id, amount, date, reason, invoice_id, credit_type, notes } = req.body;
    await db.query(
      'UPDATE sales_credit_notes SET note_no=COALESCE(?,note_no), account_id=COALESCE(?,account_id), amount=COALESCE(?,amount), date=COALESCE(?,date), reason=COALESCE(?,reason), invoice_id=COALESCE(?,invoice_id), credit_type=COALESCE(?,credit_type), notes=COALESCE(?,notes) WHERE id=?',
      [note_no, account_id, amount, date, reason, invoice_id, credit_type, notes, req.params.id]
    );
    const [[row]] = await db.query(
      'SELECT cn.*, a.name AS account_name, i.invoice_no FROM sales_credit_notes cn LEFT JOIN sales_accounts a ON cn.account_id = a.id LEFT JOIN sales_invoices i ON cn.invoice_id = i.id WHERE cn.id=?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Credit note not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Items ────────────────────────────────────────────────────────────────────
exports.getItems = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM sales_items WHERE enterprise_id = ? ORDER BY created_at DESC', [req.enterpriseId]);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.generateItemCode = async (req, res) => {
  try {
    const code = 'ITM-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10);
    res.json({ success: true, data: { code } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createItem = async (req, res) => {
  try {
    let { name, description, rate, unit, category, tax_rate, code } = req.body;
    if (!code || code.trim() === '') {
      code = 'ITM-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10);
    }
    const id = uuidv4();
    await db.query('INSERT INTO sales_items (id, name, description, rate, unit, category, tax_rate, code, enterprise_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, name, description, rate||0, unit||'pcs', category, tax_rate||0, code, req.enterpriseId]);
    const [[row]] = await db.query('SELECT * FROM sales_items WHERE id=?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteItem = async (req, res) => {
  try {
    await db.query('DELETE FROM sales_items WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getItemById = async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT * FROM sales_items WHERE id=?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateItem = async (req, res) => {
  try {
    const { name, description, rate, unit, category, tax_rate, code } = req.body;
    await db.query(
      'UPDATE sales_items SET name=COALESCE(?,name), description=COALESCE(?,description), rate=COALESCE(?,rate), unit=COALESCE(?,unit), category=COALESCE(?,category), tax_rate=COALESCE(?,tax_rate), code=COALESCE(?,code) WHERE id=?',
      [name, description, rate, unit, category, tax_rate, code, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM sales_items WHERE id=?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Proposals ────────────────────────────────────────────────────────────
exports.getProposals = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    const [rows] = await db.query(
      `SELECT p.*, a.name AS account_name
       FROM sales_proposals p
       LEFT JOIN sales_accounts a ON p.account_id = a.id
       ${isSA ? '' : 'WHERE p.enterprise_id = ?'}
       ORDER BY p.created_at DESC`,
      isSA ? [] : [req.enterpriseId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createProposal = async (req, res) => {
  try {
    const { proposal_no, account_id, contact_person, valid_until, currency, proposal_type, sales_person, notes, summary, status, amount, items } = req.body;
    const id = uuidv4();
    await db.query(
      'INSERT INTO sales_proposals (id, proposal_no, account_id, contact_person, valid_until, currency, proposal_type, sales_person, notes, summary, status, amount, enterprise_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, proposal_no, account_id || null, contact_person, valid_until, currency || 'USD', proposal_type, sales_person, notes, summary, status || 'Draft', amount, req.enterpriseId]
    );

    if (items && items.length > 0) {
      for (const item of items) {
        await db.query(
          'INSERT INTO sales_proposal_items (id, proposal_id, item_name, description, quantity, rate, tax_rate, discount, amount) VALUES (?,?,?,?,?,?,?,?,?)',
          [uuidv4(), id, item.item_name, item.description, item.quantity, item.rate, item.tax_rate, item.discount, item.amount]
        );
      }
    }

    const [[row]] = await db.query('SELECT * FROM sales_proposals WHERE id=?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getProposalById = async (req, res) => {
  try {
    const [[proposal]] = await db.query(
      'SELECT p.*, a.name AS account_name, a.company_email AS account_email, a.address AS account_address FROM sales_proposals p LEFT JOIN sales_accounts a ON p.account_id = a.id WHERE p.id=?',
      [req.params.id]
    );
    if (!proposal) return res.status(404).json({ success: false, message: 'Proposal not found' });
    
    const [items] = await db.query('SELECT * FROM sales_proposal_items WHERE proposal_id=?', [req.params.id]);
    proposal.items = items;
    
    res.json({ success: true, data: proposal });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateProposal = async (req, res) => {
  try {
    const { proposal_no, account_id, contact_person, valid_until, currency, proposal_type, sales_person, notes, summary, status, amount, items } = req.body;
    const id = req.params.id;
    
    await db.query(
      'UPDATE sales_proposals SET proposal_no=COALESCE(?,proposal_no), account_id=?, contact_person=?, valid_until=?, currency=?, proposal_type=?, sales_person=?, notes=?, summary=?, status=COALESCE(?,status), amount=COALESCE(?,amount) WHERE id=?',
      [proposal_no, account_id || null, contact_person, valid_until, currency, proposal_type, sales_person, notes, summary, status, amount, id]
    );

    if (items) {
      await db.query('DELETE FROM sales_proposal_items WHERE proposal_id=?', [id]);
      for (const item of items) {
        await db.query(
          'INSERT INTO sales_proposal_items (id, proposal_id, item_name, description, quantity, rate, tax_rate, discount, amount) VALUES (?,?,?,?,?,?,?,?,?)',
          [uuidv4(), id, item.item_name, item.description, item.quantity, item.rate, item.tax_rate, item.discount, item.amount]
        );
      }
    }

    const [[row]] = await db.query('SELECT * FROM sales_proposals WHERE id=?', [id]);
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteProposal = async (req, res) => {
  try {
    await db.query('DELETE FROM sales_proposals WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};