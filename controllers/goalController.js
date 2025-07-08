import Goal from "../models/Goal.js";
import { asyncHandler, AppError } from "../utils/errorHandler.js";

// Get all goals for the current user
const getUserGoals = asyncHandler(async (req, res, next) => {
  const goals = await Goal.findByUser(req.user.id);

  res.status(200).json({
    success: true,
    count: goals.length,
    data: goals,
  });
});

// Create a new goal
const createGoal = asyncHandler(async (req, res, next) => {
  const { name, target_amount, current_amount, target_date } = req.body;

  if (!name || !target_amount || !target_date) {
    return next(
      new AppError("Please provide name, target amount, and target date", 400)
    );
  }

  const goal = await Goal.create({
    user_id: req.user.id,
    name,
    target_amount,
    current_amount: current_amount || 0,
    target_date,
  });

  res.status(201).json({
    success: true,
    data: goal,
  });
});

// Get a single goal
const getGoal = asyncHandler(async (req, res, next) => {
  const goal = await Goal.findById(req.params.id);

  if (!goal) {
    return next(new AppError("Goal not found", 404));
  }

  // Check if the goal belongs to the user
  if (goal.USER_ID !== req.user.id) {
    return next(new AppError("Not authorized to access this goal", 403));
  }

  res.status(200).json({
    success: true,
    data: goal,
  });
});

// Update a goal
const updateGoal = asyncHandler(async (req, res, next) => {
  const { name, target_amount, current_amount, target_date } = req.body;

  // Check if goal exists
  let goal = await Goal.findById(req.params.id);

  if (!goal) {
    return next(new AppError("Goal not found", 404));
  }

  // Check if the goal belongs to the user
  if (goal.USER_ID !== req.user.id) {
    return next(new AppError("Not authorized to update this goal", 403));
  }

  // Update goal
  goal = await Goal.update(req.params.id, {
    name: name || goal.NAME,
    target_amount: target_amount || goal.TARGET_AMOUNT,
    current_amount:
      current_amount !== undefined ? current_amount : goal.CURRENT_AMOUNT,
    target_date: target_date || goal.TARGET_DATE,
  });

  // Check if goal is now complete
  const isNewlyCompleted =
    Number(goal.CURRENT_AMOUNT) >= Number(goal.TARGET_AMOUNT) &&
    goal.IS_COMPLETED === 1;

  res.status(200).json({
    success: true,
    data: goal,
    isNewlyCompleted,
  });
});

// Delete a goal
const deleteGoal = asyncHandler(async (req, res, next) => {
  // Check if goal exists
  const goal = await Goal.findById(req.params.id);

  if (!goal) {
    return next(new AppError("Goal not found", 404));
  }

  // Check if the goal belongs to the user
  if (goal.USER_ID !== req.user.id) {
    return next(new AppError("Not authorized to delete this goal", 403));
  }

  await Goal.delete(req.params.id);

  res.status(200).json({
    success: true,
    data: {},
  });
});

// Allocate money to goal
const allocateToGoal = asyncHandler(async (req, res, next) => {
  const { amount, goal_id } = req.body;

  if (!amount || amount <= 0) {
    return next(new AppError("Please provide a valid positive amount", 400));
  }

  // If goal_id is provided, update that specific goal
  if (goal_id) {
    const goal = await Goal.findById(goal_id);

    if (!goal) {
      return next(new AppError("Goal not found", 404));
    }

    if (goal.USER_ID !== req.user.id) {
      return next(new AppError("Not authorized to update this goal", 403));
    }

    // Check if goal is already completed - NEW CODE
    if (goal.IS_COMPLETED === 1) {
      return next(
        new AppError("Cannot allocate funds to a completed goal", 400)
      );
    }

    const newAmount = Number(goal.CURRENT_AMOUNT) + Number(amount);
    const updatedGoal = await Goal.update(goal_id, {
      ...goal,
      current_amount: newAmount,
    });

    const isNewlyCompleted =
      newAmount >= Number(goal.TARGET_AMOUNT) && updatedGoal.IS_COMPLETED === 1;

    return res.status(200).json({
      success: true,
      data: updatedGoal,
      isNewlyCompleted,
    });
  }
  // Otherwise, allocate to the first incomplete goal
  else {
    const result = await Goal.updateProgress(req.user.id, amount);

    if (!result) {
      return res.status(200).json({
        success: true,
        message: "No active goals to allocate funds to",
        data: null,
      });
    }

    const updatedGoal = await Goal.findById(result.goalId);

    return res.status(200).json({
      success: true,
      data: updatedGoal,
      isNewlyCompleted: result.isCompleted === 1,
    });
  }
});

export {
  getUserGoals,
  createGoal,
  getGoal,
  updateGoal,
  deleteGoal,
  allocateToGoal,
};
