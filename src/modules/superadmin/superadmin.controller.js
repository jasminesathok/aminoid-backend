const { v4: uuidv4 } = require('uuid');
const User        = require('../../models/User');
const Project     = require('../../models/Project');
const Employee    = require('../../models/Employee');
const Campaign    = require('../../models/Campaign');
const Transaction = require('../../models/Transaction');
const Invoice     = require('../../models/Invoice');
const Lead        = require('../../models/Lead');
const db          = require('../../config/db');

const VALID_DISCOUNTS = [10, 20, 30];

const generateCouponCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code, isUnique = false;
  while (!isUnique) {
    code = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const [rows] = await db.query('SELECT id FROM coupons WHERE code = ?', [code]);
    isUnique = rows.length === 0;
  }
  return code;
};

const getMegaStats = async (_req, res) => {
  try {
    const [[users]]     = await db.query('SELECT COUNT(*) AS c FROM users');
    const [[projects]]  = await Project.count();
    const [[employees]] = await db.query('SELECT COUNT(*) AS c FROM employees');
    const [[campaigns]] = await Campaign.count();
    const [[rev]]       = await Transaction.sumCredits();
    const [[exp]]       = await Transaction.sumDebits();
    const [[active]]    = await Project.countByStatus('In Progress');
    const [[done]]      = await Project.countByStatus('Completed');
    const [[pending]]   = await Invoice.countByStatus('Pending');
    const [[overdue]]   = await Invoice.countByStatus('Overdue');

    res.json({ success: true, data: {
      totalUsers: users.c, totalProjects: projects.c,
      totalEmployees: employees.c, totalCampaigns: campaigns.c,
      totalRevenue: Number(rev.total), totalExpenses: Number(exp.total),
      netProfit: Number(rev.total) - Number(exp.total),
      activeProjects: active.c, completedProjects: done.c,
      pendingInvoices: pending.c, overdueInvoices: overdue.c,
    }});
  } catch (err) {
    console.error('megaStats error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getUsers = async (_req, res) => {
  try {
    const [rows] = await User.listAll();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('superadmin getUsers error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Enterprises ──────────────────────────────────────────────────────────── */

const getEnterprises = async (req, res) => {
  try {
    const q = (req.query.search || '').trim();
    const [rows] = q
      ? await User.searchEnterprises(q)
      : await User.findEnterprises();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getEnterprises error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const overrideEnterprise = async (req, res) => {
  const { subscription_status, discount_tier } = req.body;
  const tier = discount_tier !== undefined ? Number(discount_tier) : null;

  // Only validate discount_tier when it is explicitly being set to a non-null value
  if (tier !== null && tier !== 0 && !VALID_DISCOUNTS.includes(tier))
    return res.status(400).json({ success: false, message: 'discount_tier must be 10, 20, or 30' });

  try {
    const status = subscription_status || 'ACTIVE';
    await User.updateSubscription(req.params.id, { subscription_status: status, discount_tier: tier || null });
    const [rows] = await User.findEnterpriseById(req.params.id);
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Enterprise not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('overrideEnterprise error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Coupons ──────────────────────────────────────────────────────────────── */

const getCoupons = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.company_name AS enterprise_name
       FROM coupons c
       LEFT JOIN users u ON u.id = c.enterprise_id
       ORDER BY c.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getCoupons error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createCoupon = async (req, res) => {
  const pct = Number(req.body.discount_pct);
  if (!VALID_DISCOUNTS.includes(pct))
    return res.status(400).json({ success: false, message: 'discount_pct must be 10, 20, or 30' });
  try {
    const code = await generateCouponCode();
    const id   = uuidv4();
    await db.query(
      `INSERT INTO coupons (id, code, discount_pct, status, enterprise_id, created_by, expires_at)
       VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?)`,
      [id, code, pct, req.body.enterprise_id || null, req.user.id, req.body.expires_at || null]
    );
    const [rows] = await db.query('SELECT * FROM coupons WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createCoupon error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM coupons WHERE id = ?', [req.params.id]);
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    console.error('deleteCoupon error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getSettings = async (_req, res) => {
  try {
    // Ensure table exists
    await db.query(`CREATE TABLE IF NOT EXISTS system_settings (
      id INT PRIMARY KEY DEFAULT 1,
      siteName VARCHAR(255) DEFAULT 'Amnoid',
      maintenanceMode TINYINT(1) DEFAULT 0,
      supportEmail VARCHAR(255) DEFAULT 'support@amnoid.com',
      maxTenants INT DEFAULT 100,
      allowRegistration TINYINT(1) DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    const [[row]] = await db.query('SELECT * FROM system_settings WHERE id = 1');
    if (!row) {
      await db.query('INSERT IGNORE INTO system_settings (id) VALUES (1)');
      const [[newRow]] = await db.query('SELECT * FROM system_settings WHERE id = 1');
      return res.json({ success: true, data: {
        siteName: newRow.siteName,
        maintenanceMode: !!newRow.maintenanceMode,
        supportEmail: newRow.supportEmail,
        maxTenants: newRow.maxTenants,
        allowRegistration: !!newRow.allowRegistration
      }});
    }
    res.json({ success: true, data: {
        siteName: row.siteName,
        maintenanceMode: !!row.maintenanceMode,
        supportEmail: row.supportEmail,
        maxTenants: row.maxTenants,
        allowRegistration: !!row.allowRegistration
    }});
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { siteName, maintenanceMode, supportEmail, maxTenants, allowRegistration } = req.body;
    await db.query(
      `UPDATE system_settings SET 
       siteName = ?, maintenanceMode = ?, supportEmail = ?, maxTenants = ?, allowRegistration = ?
       WHERE id = 1`,
      [siteName, maintenanceMode ? 1 : 0, supportEmail, maxTenants, allowRegistration ? 1 : 0]
    );
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* ── Integrated Dashboard Metrics ─────────────────────────────────────────── */

const getIntegratedMetrics = async (_req, res) => {
  try {
    // ── Finance ────────────────────────────────────────────────────────────
    // Revenue & expenses by month (last 6 months)
    const [revExpRows] = await db.query(`
      SELECT
        DATE_FORMAT(date, '%b') AS month,
        MONTH(date) AS month_num,
        SUM(CASE WHEN type = 'Credit' THEN amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN type = 'Debit'  THEN amount ELSE 0 END) AS expenses
      FROM transactions
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month, month_num
      ORDER BY month_num ASC
    `);

    const revenueByMonth = revExpRows.map(r => Number(r.revenue));
    const profitByMonth  = revExpRows.map(r => Number(r.revenue) - Number(r.expenses));
    const revLabels      = revExpRows.map(r => r.month);

    // Totals
    const [[revTotal]]  = await db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'Credit'");
    const [[expTotal]]  = await db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'Debit'");
    const totalRevenue  = Number(revTotal.total);
    const totalExpenses = Number(expTotal.total);
    const totalProfit   = totalRevenue - totalExpenses;
    const ebitda        = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
    const cashFlow      = totalProfit;

    // Expense categories (top 4)
    const [expCats] = await db.query(`
      SELECT category AS l, COALESCE(SUM(amount), 0) AS v
      FROM expenses
      GROUP BY category
      ORDER BY v DESC
      LIMIT 4
    `);
    const expenseCategories = expCats.map(r => ({ l: r.l || 'Other', v: Number(r.v) }));

    // Budget utilisation from campaigns
    const [[budgetRow]] = await db.query('SELECT COALESCE(SUM(budget), 0) AS budget, COALESCE(SUM(spent), 0) AS spent FROM campaigns');
    const budgetUtil = Number(budgetRow.budget) > 0
      ? Math.round((Number(budgetRow.spent) / Number(budgetRow.budget)) * 100)
      : 0;

    // ── HR ─────────────────────────────────────────────────────────────────
    // Total headcount
    const [[hcTotal]] = await db.query("SELECT COUNT(*) AS c FROM employees");
    const totalHeadcount = hcTotal.c;

    // Headcount trend by month (last 6 months — cumulative employees by join_date)
    const [hcTrend] = await db.query(`
      SELECT
        DATE_FORMAT(join_date, '%Y-%m') AS ym,
        COUNT(*) AS hired
      FROM employees
      WHERE join_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY ym
      ORDER BY ym ASC
    `);
    // Build cumulative trend: start from (totalHeadcount - recent hires), add each month
    const recentHires = hcTrend.reduce((s, r) => s + r.hired, 0);
    let runningHC = totalHeadcount - recentHires;
    const headcountTrend = hcTrend.map(r => { runningHC += r.hired; return runningHC; });
    // Pad to at least 6 points
    while (headcountTrend.length < 6) headcountTrend.unshift(headcountTrend[0] || 0);

    // Turnover trend (employees with status 'Inactive' or 'Terminated' by month)
    const [toTrend] = await db.query(`
      SELECT
        DATE_FORMAT(updated_at, '%Y-%m') AS ym,
        COUNT(*) AS left_count
      FROM employees
      WHERE status IN ('Inactive', 'Terminated')
        AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY ym
      ORDER BY ym ASC
    `);
    const turnoverMap = {};
    toTrend.forEach(r => { turnoverMap[r.ym] = r.left_count; });
    const turnoverTrend = hcTrend.length > 0
      ? hcTrend.map(r => turnoverMap[r.ym] || 0)
      : [0, 0, 0, 0, 0, 0];
    while (turnoverTrend.length < 6) turnoverTrend.unshift(0);

    // Department distribution (top 5)
    const DEPT_COLORS = ['#60A5FA', '#A78BFA', '#34D399', '#F472B6', '#FBBF24'];
    const [deptRows] = await db.query(`
      SELECT department AS l, COUNT(*) AS v
      FROM employees
      WHERE department IS NOT NULL AND department != ''
      GROUP BY department
      ORDER BY v DESC
      LIMIT 5
    `);
    const deptDistribution = deptRows.map((r, i) => ({
      l: r.l, v: r.v, c: DEPT_COLORS[i % DEPT_COLORS.length]
    }));

    // Diversity index — group by department as a proxy
    const DIV_COLORS = ['#60A5FA', '#F472B6', '#A78BFA', '#34D399', '#FBBF24'];
    const topDepts = deptRows.slice(0, 3);
    const deptTotal = topDepts.reduce((s, r) => s + r.v, 0) || 1;
    const diversitySegs = topDepts.map((r, i) => ({
      c: DIV_COLORS[i], v: Math.round((r.v / deptTotal) * 100)
    }));
    if (diversitySegs.length === 0) diversitySegs.push({ c: '#60A5FA', v: 100 });

    // Avg time to hire (days between created_at and join_date)
    const [[hireDays]] = await db.query(`
      SELECT COALESCE(ROUND(AVG(DATEDIFF(join_date, created_at))), 0) AS avg_days
      FROM employees
      WHERE join_date IS NOT NULL AND created_at IS NOT NULL
    `);
    const avgTimeToHire = Math.abs(Number(hireDays.avg_days)) || 0;

    // Employee NPS — derive from attendance rate as a proxy
    const [[attRate]] = await db.query(`
      SELECT
        COUNT(CASE WHEN status = 'Present' THEN 1 END) AS present,
        COUNT(*) AS total
      FROM attendance
    `);
    const attPct = attRate.total > 0 ? (attRate.present / attRate.total) * 100 : 50;
    // Map attendance % to NPS-like score (-100 to +100, center around 50% attendance = 0)
    const employeeNps = Math.round((attPct - 50) * 2);

    // ── Marketing ──────────────────────────────────────────────────────────
    // Lead funnel
    const [[totalLeadsRow]] = await db.query('SELECT COUNT(*) AS c FROM leads');
    const [[mqlRow]]       = await db.query("SELECT COUNT(*) AS c FROM leads WHERE status IN ('Contacted', 'Qualified')");
    const [[sqlRow]]       = await db.query("SELECT COUNT(*) AS c FROM leads WHERE status = 'Qualified'");
    const [[wonRow]]       = await db.query("SELECT COUNT(*) AS c FROM leads WHERE status = 'Converted'");

    const totalLeads = totalLeadsRow.c;
    const mqlCount   = mqlRow.c;
    const sqlCount   = sqlRow.c;
    const wonCount   = wonRow.c;

    const funnel = [
      { l: 'Leads', v: totalLeads, pct: 100 },
      { l: 'MQLs',  v: mqlCount,  pct: totalLeads > 0 ? Math.round((mqlCount / totalLeads) * 100) : 0 },
      { l: 'SQLs',  v: sqlCount,  pct: totalLeads > 0 ? Math.round((sqlCount / totalLeads) * 100) : 0 },
      { l: 'Won',   v: wonCount,  pct: totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0 },
    ];

    // Campaign stats for CPL and ROI
    const [[campStats]] = await db.query(`
      SELECT
        COALESCE(SUM(spent), 0) AS totalSpent,
        COALESCE(SUM(leads), 0) AS totalCampLeads,
        COALESCE(SUM(conversions), 0) AS totalConversions,
        COALESCE(SUM(budget), 0) AS totalBudget
      FROM campaigns
    `);
    const cpl = Number(campStats.totalCampLeads) > 0
      ? Math.round((Number(campStats.totalSpent) / Number(campStats.totalCampLeads)) * 100) / 100
      : 0;
    const roi = Number(campStats.totalSpent) > 0
      ? Math.round((totalRevenue / Number(campStats.totalSpent)) * 10) / 10
      : 0;

    // Engagement scores (per-channel conversion rates, normalized 0-100)
    const [channelRows] = await db.query(`
      SELECT channel,
        COALESCE(SUM(leads), 0) AS leads,
        COALESCE(SUM(conversions), 0) AS conversions,
        COALESCE(SUM(spent), 0) AS spent
      FROM campaigns
      GROUP BY channel
      ORDER BY leads DESC
      LIMIT 5
    `);
    const engagementScores = channelRows.length >= 5
      ? channelRows.map(r => r.leads > 0 ? Math.min(Math.round((r.conversions / r.leads) * 100), 100) : 50)
      : [50, 50, 50, 50, 50]; // fallback if fewer than 5 channels

    // ── Inventory / Assets ─────────────────────────────────────────────────
    const ASSET_COLORS = ['#60A5FA', '#A78BFA', '#34D399', '#64748B', '#F472B6'];
    const [assetCats] = await db.query(`
      SELECT type AS l, COALESCE(SUM(value), 0) AS v, COUNT(*) AS cnt
      FROM assets
      GROUP BY type
      ORDER BY v DESC
      LIMIT 5
    `);
    const valueByCategory = assetCats.map((r, i) => ({
      l: (r.l || 'Other').substring(0, 5),
      v: Number(r.v),
      c: ASSET_COLORS[i % ASSET_COLORS.length]
    }));

    // Stock alerts by status
    const ALERT_COLORS = { 'Available': '#34D399', 'In Use': '#60A5FA', 'Maintenance': '#F87171', 'Retired': '#FBBF24' };
    const [alertRows] = await db.query(`
      SELECT status, COUNT(*) AS cnt
      FROM assets
      GROUP BY status
      ORDER BY cnt DESC
    `);
    const [[assetTotals]] = await db.query('SELECT COUNT(*) AS c FROM assets');
    const totalAssets = assetTotals.c;
    const stockAlerts = alertRows.map(r => ({
      s: r.status || 'Unknown',
      cur: r.status === 'Available' ? 'Current' : (r.status === 'Maintenance' ? 'Reorder' : 'Current'),
      c: ALERT_COLORS[r.status] || '#64748B',
      pct: totalAssets > 0 ? Math.round((r.cnt / totalAssets) * 100) : 0
    }));

    const outOfStock = alertRows.find(r => r.status === 'Maintenance')?.cnt || 0;
    const stockouts  = alertRows.find(r => r.status === 'Retired')?.cnt || 0;

    // ── Assemble response ──────────────────────────────────────────────────
    res.json({ success: true, data: {
      finance: {
        revenueByMonth, profitByMonth, revLabels,
        expenseCategories: expenseCategories.length > 0
          ? expenseCategories
          : [{ l: 'N/A', v: 0 }],
        budgetUtil, ebitda, cashFlow,
        totalRevenue, totalProfit,
      },
      hr: {
        headcountTrend, turnoverTrend,
        deptDistribution: deptDistribution.length > 0
          ? deptDistribution
          : [{ l: 'N/A', v: 0, c: '#60A5FA' }],
        diversitySegs,
        avgTimeToHire, employeeNps,
        totalHeadcount,
      },
      marketing: {
        funnel, engagementScores,
        totalLeads, cpl, roi,
      },
      inventory: {
        valueByCategory: valueByCategory.length > 0
          ? valueByCategory
          : [{ l: 'N/A', v: 0, c: '#60A5FA' }],
        stockAlerts: stockAlerts.length > 0
          ? stockAlerts
          : [{ s: 'N/A', cur: 'Current', c: '#64748B', pct: 0 }],
        totalSKUs: totalAssets,
        stockouts,
        outOfStock,
      },
    }});
  } catch (err) {
    console.error('getIntegratedMetrics error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getMegaStats, getUsers,
  getEnterprises, overrideEnterprise,
  getCoupons, createCoupon, deleteCoupon,
  getSettings, updateSettings,
  getIntegratedMetrics
};