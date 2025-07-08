import express from 'express';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByDateRange,
  getDashboardSummary,
  getMonthlyIncomeVsExpense,
  getSpendingByCategory,
  getFinancialTrends,
  getAdminStats
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Protected routes
router.get('/', protect, getTransactions);
router.get('/date-range', protect, getTransactionsByDateRange);
router.get('/dashboard-summary', protect, getDashboardSummary);
router.get('/income-vs-expense', protect, getMonthlyIncomeVsExpense);
router.get('/spending-by-category', protect, getSpendingByCategory);
router.get('/financial-trends', protect, getFinancialTrends);
router.get('/:id', protect, getTransaction);
router.post('/', protect, createTransaction);
router.put('/:id', protect, updateTransaction);
router.delete('/:id', protect, deleteTransaction);

// Admin routes
router.get('/admin/stats', protect, authorize('ADMIN'), getAdminStats);

export default router;