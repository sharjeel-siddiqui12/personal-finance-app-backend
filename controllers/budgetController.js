import Budget from "../models/Budget.js";
import Category from "../models/Category.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

// Get all budgets for a user
const getBudgets = asyncHandler(async (req, res, next) => {
  const budgets = await Budget.getAll(req.user.id);

  res.status(200).json({
    success: true,
    count: budgets.length,
    data: budgets,
  });
});

// Get a single budget
const getBudget = asyncHandler(async (req, res, next) => {
  const budget = await Budget.getById(req.params.id, req.user.id);

  if (!budget) {
    return next(new AppError("Budget not found", 404));
  }

  res.status(200).json({
    success: true,
    data: budget,
  });
});

// Create a new budget
// Modify the createBudget function
const createBudget = asyncHandler(async (req, res, next) => {
  const { category_id, amount, start_date, end_date } = req.body;

  // Check if category exists and belongs to user
  const category = await Category.getById(category_id, req.user.id);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Check if budget amount is sufficient for existing transactions
  const validation = await Budget.validateBudgetAmount(
    req.user.id,
    category_id,
    amount,
    start_date,
    end_date
  );

  if (!validation.isValid) {
    return next(
      new AppError(
        `Budget amount (Rs. ${amount}) is less than already spent amount (Rs. ${validation.totalSpent.toFixed(
          2
        )}) for this category in the selected period. Please increase your budget by at least Rs. ${validation.deficit.toFixed(
          2
        )}.`,
        400
      )
    );
  }

  // Create budget
  const budgetData = {
    user_id: req.user.id,
    category_id,
    amount,
    start_date,
    end_date,
  };

  const budget = await Budget.create(budgetData);

  res.status(201).json({
    success: true,
    data: budget,
  });
});

// Update a budget
// Update a budget
const updateBudget = asyncHandler(async (req, res, next) => {
  let budget = await Budget.getById(req.params.id, req.user.id);

  if (!budget) {
    return next(new AppError("Budget not found", 404));
  }

  const { amount, start_date, end_date } = req.body;

  // Add validation to check if the updated budget amount is sufficient
  const validation = await Budget.validateBudgetAmount(
    req.user.id,
    budget.CATEGORY_ID || budget.category_id,
    amount,
    start_date || budget.START_DATE || budget.start_date,
    end_date || budget.END_DATE || budget.end_date
  );

  if (!validation.isValid) {
    return next(
      new AppError(
        `Budget amount (Rs. ${amount}) is less than already spent amount (Rs. ${validation.totalSpent.toFixed(
          2
        )}) for this category in the selected period. Please increase your budget by at least Rs. ${validation.deficit.toFixed(
          2
        )}.`,
        400
      )
    );
  }

  // Update budget
  const budgetData = {
    user_id: req.user.id,
    amount,
    start_date: start_date || budget.START_DATE || budget.start_date,
    end_date: end_date || budget.END_DATE || budget.end_date,
  };

  budget = await Budget.update(req.params.id, budgetData);

  res.status(200).json({
    success: true,
    data: budget,
  });
});

// Delete a budget
const deleteBudget = asyncHandler(async (req, res, next) => {
  const budget = await Budget.getById(req.params.id, req.user.id);

  if (!budget) {
    return next(new AppError("Budget not found", 404));
  }

  await Budget.delete(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: {},
  });
});

// Get budget performance
const getBudgetPerformance = asyncHandler(async (req, res, next) => {
  const performance = await Budget.getBudgetPerformance(req.user.id);

  res.status(200).json({
    success: true,
    data: performance,
  });
});

// Get budget vs actual
const getBudgetVsActual = asyncHandler(async (req, res, next) => {
  const data = await Budget.getBudgetVsActual(req.user.id);

  res.status(200).json({
    success: true,
    data,
  });
});

export {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetPerformance,
  getBudgetVsActual,
};
