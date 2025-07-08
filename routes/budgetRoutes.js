import express from 'express';
import {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetPerformance,
  getBudgetVsActual
} from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes
router.get('/', protect, getBudgets);
router.get('/performance', protect, getBudgetPerformance);
router.get('/vs-actual', protect, getBudgetVsActual);
router.get('/:id', protect, getBudget);
router.post('/', protect, createBudget);
router.put('/:id', protect, updateBudget);
router.delete('/:id', protect, deleteBudget);

export default router;