import express from 'express';
import { 
  getDashboardSummary, 
  getMonthlyIncomeVsExpense,
  getSpendingByCategory,
  getFinancialTrends
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/summary', protect, getDashboardSummary);
router.get('/income-vs-expense', protect, getMonthlyIncomeVsExpense);
router.get('/spending-by-category', protect, getSpendingByCategory);
router.get('/trends', protect, getFinancialTrends);

export default router;