require('dotenv').config();
require('./config/db'); // initialise pool & test connection
const runMigrations = require('./database/migrate');

const express = require('express');
const cors    = require('cors');

const authRoutes       = require('./modules/auth/auth.routes');
const dashboardRoutes  = require('./modules/dashboard/dashboard.routes');
const projectsRoutes   = require('./modules/projects/projects.routes');
const hrRoutes         = require('./modules/hr/hr.routes');
const marketingRoutes  = require('./modules/marketing/marketing.routes');
const accountsRoutes   = require('./modules/accounts/accounts.routes');
const reportsRoutes    = require('./modules/reports/reports.routes');
const profileRoutes    = require('./modules/profile/profile.routes');
const calendarRoutes   = require('./modules/calendar/calendar.routes');
const superadminRoutes = require('./modules/superadmin/superadmin.routes');
const kanbanRoutes     = require('./modules/kanban/kanban.routes');
const filesRoutes      = require('./modules/files/files.routes');
const faqRoutes        = require('./modules/faq/faq.routes');
const salesRoutes          = require('./modules/sales/sales.routes');
const knowledgeRoutes      = require('./modules/knowledge/knowledge.routes');
const subscriptionsRoutes  = require('./modules/subscriptions/subscriptions.routes');
const setupRoutes          = require('./modules/setup/setup.routes');
const assetsRoutes         = require('./modules/assets/assets.routes');
const plansRoutes          = require('./modules/plans/plans.routes');


const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : true; // allow all in development
  // In app.js / index.js, BEFORE app.use(compression())
app.get('/api/hr/my/payslip/pdf', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-transform');
  next();
});
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10mb' }));
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/projects',   projectsRoutes);
app.use('/api/hr',         hrRoutes);
app.use('/api/marketing',  marketingRoutes);
app.use('/api/accounts',   accountsRoutes);
app.use('/api/reports',    reportsRoutes);
app.use('/api/profile',    profileRoutes);
app.use('/api/calendar',   calendarRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/kanban',     kanbanRoutes);
app.use('/api/files',      filesRoutes);
app.use('/api/faq',           faqRoutes);
app.use('/api/sales',         salesRoutes);
app.use('/api/knowledge',     knowledgeRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/setup',         setupRoutes);
app.use('/api/assets',        assetsRoutes);
app.use('/api/plans',         plansRoutes);


// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', app: 'Amnoid Backend (MySQL)', timestamp: new Date().toISOString() })
);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  await runMigrations();
  server = app.listen(PORT, () => {
    console.log(`\n🚀  Amnoid Backend  →  http://localhost:${PORT}`);
    console.log(`    Environment    →  ${process.env.NODE_ENV || 'development'}`);
    console.log(`    Health check   →  http://localhost:${PORT}/health\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use. Stop the running backend instance or change PORT in .env.`);
      process.exit(1);
    }
    throw err;
  });
};

const shutdown = () => {
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
};

process.once('SIGUSR2', () => {
  shutdown();
  process.kill(process.pid, 'SIGUSR2');
});
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
