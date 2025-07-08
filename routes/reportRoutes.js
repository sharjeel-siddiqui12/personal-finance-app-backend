import express from 'express';
import {
  getMonthlyReport,
  getReportByDateRange,
  downloadReportPdf,
  downloadReportCsv
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes
router.get('/monthly', protect, getMonthlyReport);
router.get('/range', protect, getReportByDateRange);
router.get('/download/pdf', protect, downloadReportPdf);
router.get('/download/csv', protect, downloadReportCsv);

export default router;