import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";
import Budget from "../models/Budget.js";

// Get all transactions for a user
const getTransactions = asyncHandler(async (req, res, next) => {
  const transactions = await Transaction.getAll(req.user.id);

  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions,
  });
});

// Get a single transaction
const getTransaction = asyncHandler(async (req, res, next) => {
  const transaction = await Transaction.getById(req.params.id, req.user.id);

  if (!transaction) {
    return next(new AppError("Transaction not found", 404));
  }

  res.status(200).json({
    success: true,
    data: transaction,
  });
});

// Create a new transaction
// Create a new transaction
const createTransaction = asyncHandler(async (req, res, next) => {
  const { category_id, amount, date, description, type } = req.body;

  // Check if category exists and belongs to user
  const category = await Category.getById(category_id, req.user.id);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Create transaction data object first (before any conditional logic)
  const transactionData = {
    user_id: req.user.id,
    category_id,
    amount,
    transaction_date: date,
    description,
    type: type.toUpperCase(),
  };

  // Check budget limit for expense transactions
  if (type.toUpperCase() === "EXPENSE") {
    const budgetCheck = await Budget.checkBudgetLimit(
      req.user.id,
      category_id,
      amount,
      type
    );

    // If transaction exceeds budget limit
    if (!budgetCheck.withinLimit) {
      return next(
        new AppError(
          `This transaction would exceed your budget for ${budgetCheck.categoryName}. ` +
            `Budget: Rs. ${budgetCheck.budget.toFixed(2)}, ` +
            `Current usage: Rs. ${budgetCheck.currentUsage.toFixed(2)}, ` +
            `Remaining: Rs. ${budgetCheck.remaining.toFixed(2)}`,
          400
        )
      );
    }
  }

  try {
    // Create transaction with proper error handling
    const transaction = await Transaction.create(transactionData);

    // Successfully created transaction
    return res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Transaction creation error:", error);
    return next(
      new AppError(`Failed to create transaction: ${error.message}`, 500)
    );
  }
});

// Update a transaction
// Update a transaction
const updateTransaction = asyncHandler(async (req, res, next) => {
  let transaction = await Transaction.getById(req.params.id, req.user.id);

  if (!transaction) {
    return next(new AppError("Transaction not found", 404));
  }

  const { category_id, amount, transaction_date, description, type } = req.body;

  // Check if category exists and belongs to user
  const category = await Category.getById(category_id, req.user.id);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Check budget limit for expense transactions
  if (type.toUpperCase() === "EXPENSE") {
    // Get the original transaction amount for correct budget calculation
    const originalAmount = transaction.AMOUNT || transaction.amount || 0;
    const amountDifference = parseFloat(amount) - parseFloat(originalAmount);

    // Only check budget if amount is increased or category changed
    if (amountDifference > 0 || category_id !== transaction.CATEGORY_ID) {
      const budgetCheck = await Budget.checkBudgetLimit(
        req.user.id,
        category_id,
        amountDifference, // Only check the difference in amount
        type,
        true, // Flag indicating this is an update
        transaction.CATEGORY_ID !== category_id ? transaction.CATEGORY_ID : null // Pass original category if changed
      );

      // If transaction exceeds budget limit
      if (!budgetCheck.withinLimit) {
        return next(
          new AppError(
            `This update would exceed your budget for ${budgetCheck.categoryName}. ` +
              `Budget: Rs. ${budgetCheck.budget.toFixed(2)}, ` +
              `Current usage: Rs. ${budgetCheck.currentUsage.toFixed(2)}, ` +
              `Remaining: Rs. ${budgetCheck.remaining.toFixed(2)}`,
            400
          )
        );
      }
    }
  }

  // Update transaction
  const transactionData = {
    user_id: req.user.id,
    category_id,
    amount,
    transaction_date,
    description,
    type: type.toUpperCase(),
  };

  transaction = await Transaction.update(req.params.id, transactionData);

  res.status(200).json({
    success: true,
    data: transaction,
  });
});

// Delete a transaction
const deleteTransaction = asyncHandler(async (req, res, next) => {
  const transaction = await Transaction.getById(req.params.id, req.user.id);

  if (!transaction) {
    return next(new AppError("Transaction not found", 404));
  }

  await Transaction.delete(req.params.id);

  res.status(200).json({
    success: true,
    data: {},
  });
});

// Get transactions by date range
const getTransactionsByDateRange = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError("Please provide start and end dates", 400));
  }

  const transactions = await Transaction.getTransactionsByDateRange(
    req.user.id,
    startDate,
    endDate
  );

  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions,
  });
});

// Get dashboard summary data
const getDashboardSummary = asyncHandler(async (req, res, next) => {
  const summary = await Transaction.getDashboardSummary(req.user.id);

  res.status(200).json({
    success: true,
    data: summary,
  });
});

// Get monthly income vs. expense data
const getMonthlyIncomeVsExpense = asyncHandler(async (req, res, next) => {
  const data = await Transaction.getMonthlyIncomeVsExpense(req.user.id);

  res.status(200).json({
    success: true,
    data,
  });
});

// Get spending by category
const getSpendingByCategory = asyncHandler(async (req, res, next) => {
  const data = await Transaction.getSpendingByCategory(req.user.id);

  res.status(200).json({
    success: true,
    data,
  });
});

// Get financial trends
const getFinancialTrends = asyncHandler(async (req, res, next) => {
  const data = await Transaction.getFinancialTrends(req.user.id);

  res.status(200).json({
    success: true,
    data,
  });
});

// Get admin dashboard statistics
const getAdminStats = asyncHandler(async (req, res, next) => {
  const stats = await Transaction.getAdminStats();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

export {
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
  getAdminStats,
};
