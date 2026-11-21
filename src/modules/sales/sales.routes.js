const express = require('express');
// const express = require('express');
const router  = express.Router();
const {
  getSalesOverview,
  getAccounts, createAccount, updateAccount, deleteAccount,
  getContacts, createContact, updateContact, deleteContact,
  getDeals,   createDeal,   updateDeal,   deleteDeal,
  getProposals, createProposal, getProposalById, updateProposal, deleteProposal,
  getEstimates, createEstimate, getEstimateById, updateEstimate, deleteEstimate, uploadEstimateAttachment, deleteEstimateAttachment,
  getInvoices, createInvoice, getInvoiceById, updateInvoice, downloadInvoicePdf, deleteInvoice, uploadInvoiceAttachment, deleteInvoiceAttachment,
  getPayments, createPayment, getPaymentById, updatePayment, deletePayment,
  getCreditNotes, createCreditNote, getCreditNoteById, updateCreditNote, deleteCreditNote,
  getItems, createItem, getItemById, updateItem, deleteItem, generateItemCode,
} = require('./sales.controller');
const { protect } = require('../../middleware/auth');
const { tenancy } = require('../../middleware/tenancy');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../uploads/invoices');
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

router.use(protect, tenancy);

router.get('/overview', getSalesOverview);

router.get('/accounts',        getAccounts);
router.post('/accounts',       createAccount);
router.put('/accounts/:id',    updateAccount);
router.delete('/accounts/:id', deleteAccount);

router.get('/contacts',        getContacts);
router.post('/contacts',       createContact);
router.put('/contacts/:id',    updateContact);
router.delete('/contacts/:id', deleteContact);

router.get('/deals',        getDeals);
router.post('/deals',       createDeal);
router.put('/deals/:id',    updateDeal);
router.delete('/deals/:id', deleteDeal);

router.get('/proposals',        getProposals);
router.post('/proposals',       createProposal);
router.put('/proposals/:id',    updateProposal);
router.delete('/proposals/:id', deleteProposal);

router.get('/estimates',           getEstimates);
router.post('/estimates',          createEstimate);
router.get('/estimates/:id',       getEstimateById);
router.put('/estimates/:id',       updateEstimate);
router.delete('/estimates/:id',    deleteEstimate);
router.post('/estimates/:id/attachments', upload.single('file'), uploadEstimateAttachment);
router.delete('/estimates/:id/attachments/:attachmentId', deleteEstimateAttachment);

router.get('/invoices',            getInvoices);
router.post('/invoices',           createInvoice);
router.get('/invoices/:id',        getInvoiceById);
router.put('/invoices/:id',        updateInvoice);
router.get('/invoices/:id/pdf',    downloadInvoicePdf);
router.delete('/invoices/:id',     deleteInvoice);
router.post('/invoices/:id/attachments', upload.single('file'), uploadInvoiceAttachment);
router.delete('/invoices/:id/attachments/:attachmentId', deleteInvoiceAttachment);

router.get('/payments',            getPayments);
router.post('/payments',           createPayment);
router.get('/payments/:id',        getPaymentById);
router.put('/payments/:id',        updatePayment);
router.delete('/payments/:id',     deletePayment);

router.get('/credit-notes',        getCreditNotes);
router.post('/credit-notes',       createCreditNote);
router.get('/credit-notes/:id',    getCreditNoteById);
router.put('/credit-notes/:id',    updateCreditNote);
router.delete('/credit-notes/:id', deleteCreditNote);

router.get('/items',        getItems);
router.get('/items/generate-code', generateItemCode);
router.post('/items',       createItem);
router.get('/items/:id',    getItemById);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);

// ─── Proposals ────────────────────────────────────────────────────────────
router.get('/proposals', getProposals);
router.post('/proposals', createProposal);
router.get('/proposals/:id', getProposalById);
router.put('/proposals/:id', updateProposal);
router.delete('/proposals/:id', deleteProposal);

module.exports = router;
