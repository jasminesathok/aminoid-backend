const express = require('express');
const router = express.Router();
const { getInvoices, createInvoice, updateInvoice, recordInvoicePayment, deleteInvoice, getExpenses, createExpense, updateExpense, deleteExpense, getTransactions, getTransactionById, createTransaction, updateTransaction, deleteTransaction, uploadTransactionAttachment, getOverview, getMonthlyReport } = require('./accounts.controller');
const { protect, adminOnly } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../uploads/transactions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

router.use(protect, tenancy, adminOnly);

router.get('/overview',      getOverview);
router.get('/monthly',       getMonthlyReport);
router.get('/invoices',      getInvoices);
router.post('/invoices',     createInvoice);
router.put('/invoices/:id',  updateInvoice);
router.patch('/invoices/:id/payment', recordInvoicePayment);
router.delete('/invoices/:id', deleteInvoice);
router.get('/expenses',      getExpenses);
router.post('/expenses',     createExpense);
router.put('/expenses/:id',  updateExpense);
router.delete('/expenses/:id', deleteExpense);
router.get('/transactions',         getTransactions);
router.get('/transactions/:id',     getTransactionById);
router.post('/transactions',        createTransaction);
router.put('/transactions/:id',     updateTransaction);
router.delete('/transactions/:id',  deleteTransaction);
router.post('/transactions/:id/attachment', upload.single('file'), uploadTransactionAttachment);

module.exports = router;