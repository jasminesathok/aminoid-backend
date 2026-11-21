const Transaction = require('../../models/Transaction');
const Project     = require('../../models/Project');
const Employee    = require('../../models/Employee');
const Task        = require('../../models/Task');
const Campaign    = require('../../models/Campaign');
const Invoice     = require('../../models/Invoice');
const db          = require('../../config/db');

const getStats = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    const isMember = req.user.role === 'member';
    const eid = req.enterpriseId;
    
    let totalRevenue = 0, totalExpenses = 0, activeProjects = 0;
    let totalEmployees = 0, openTasks = 0, activeCampaigns = 0, pendingInvoices = 0;

    if (isMember) {
      const [[proj]] = await db.query(
        'SELECT COUNT(DISTINCT p.id) AS c FROM projects p JOIN project_members pm ON p.id = pm.project_id WHERE p.status = "In Progress" AND pm.user_id = ? AND p.enterprise_id = ?', 
        [req.user.id, eid]
      );
      activeProjects = proj.c;

      const [[taskCount]] = await db.query(
        "SELECT COUNT(*) AS c FROM tasks WHERE status != 'Done' AND assigned_to = ? AND enterprise_id = ?", 
        [req.user.id, eid]
      );
      openTasks = taskCount.c;
    } else {
      const [[revenue]]  = await Transaction.sumCredits(eid);
      const [[expenses]] = await Transaction.sumDebits(eid);
      const [[proj]] = await Project.countByStatus('In Progress', isSA ? null : eid);
      const [[empCount]] = await db.query('SELECT COUNT(*) AS c FROM employees WHERE enterprise_id = ?', [eid]);
      const [[taskCount]] = await db.query("SELECT COUNT(*) AS c FROM tasks WHERE status != 'Done' AND enterprise_id = ?", [eid]);
      const [[campCount]] = await db.query("SELECT COUNT(*) AS c FROM campaigns WHERE status = 'Active' AND enterprise_id = ?", [eid]);
      const [[invCount]]  = await db.query("SELECT COUNT(*) AS c FROM invoices WHERE status = 'Pending' AND enterprise_id = ?", [eid]);

      totalRevenue  = Number(revenue.total);
      totalExpenses = Number(expenses.total);
      activeProjects = proj.c;
      totalEmployees = empCount.c;
      openTasks = taskCount.c;
      activeCampaigns = campCount.c;
      pendingInvoices = invCount.c;
    }

    res.json({
      success: true,
      data: {
        totalRevenue, totalExpenses,
        netProfit:       totalRevenue - totalExpenses,
        activeProjects,
        totalEmployees,
        openTasks,
        activeCampaigns,
        pendingInvoices,
      },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const isMember = req.user.role === 'member';
    let query = `
      SELECT id, type, message, created_at
      FROM activities
      WHERE enterprise_id = ?
    `;
    const params = [req.enterpriseId];
    
    if (isMember) {
      query += ` AND user_id = ?`;
      params.push(req.user.id);
    }
    
    query += ` ORDER BY created_at DESC LIMIT 10`;

    const [rows] = await db.query(query, params);

    const formatTime = (date) => {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + " years ago";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + " months ago";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + " days ago";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + " hours ago";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + " minutes ago";
      return Math.floor(seconds) + " seconds ago";
    };

    const data = rows.map(r => ({
      id: r.id, type: r.type, message: r.message, time: formatTime(r.created_at)
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getRevenueChart = async (req, res) => {
  try {
    if (req.user.role === 'member') {
      return res.json({ success: true, data: [
        { month: 'Jan', revenue: 0, expenses: 0 },
        { month: 'Feb', revenue: 0, expenses: 0 },
        { month: 'Mar', revenue: 0, expenses: 0 }
      ]});
    }

    const [rows] = await db.query(`
      SELECT 
        DATE_FORMAT(date, '%b') AS month,
        MONTH(date) AS month_num,
        SUM(CASE WHEN type = 'Credit' THEN amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN type = 'Debit'  THEN amount ELSE 0 END) AS expenses
      FROM transactions
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        AND enterprise_id = ?
      GROUP BY month, month_num
      ORDER BY month_num ASC
    `, [req.enterpriseId]);

    if (rows.length === 0) {
      return res.json({ success: true, data: [
        { month: 'Jan', revenue: 0, expenses: 0 },
        { month: 'Feb', revenue: 0, expenses: 0 },
        { month: 'Mar', revenue: 0, expenses: 0 }
      ]});
    }

    res.json({ success: true, data: rows.map(r => ({
      month: r.month, revenue: Number(r.revenue), expenses: Number(r.expenses)
    })) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getStats, getRecentActivity, getRevenueChart };

