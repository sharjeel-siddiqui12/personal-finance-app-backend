import Category from "../models/Category.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

// Get all categories for a user
const getCategories = asyncHandler(async (req, res, next) => {
  const categories = await Category.getAll(req.user.id);

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

// Get a single category
const getCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.getById(req.params.id, req.user.id);

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

// Create a new category
const createCategory = asyncHandler(async (req, res, next) => {
  const { name, type } = req.body;

  const categoryData = {
    name,
    type: type.toUpperCase(),
    user_id: req.user.id,
  };

  const category = await Category.create(categoryData);

  res.status(201).json({
    success: true,
    data: category,
  });
});

// Update a category
const updateCategory = asyncHandler(async (req, res, next) => {
  let category = await Category.getById(req.params.id, req.user.id);

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Prevent updating system categories (those with null user_id)
  if (!category.user_id) {
    return next(new AppError("Cannot update system categories", 403));
  }

  const { name, type } = req.body;

  category = await Category.update(req.params.id, { name, type }, req.user.id);

  res.status(200).json({
    success: true,
    data: category,
  });
});

// Delete a category
// Delete a category
// Delete a category
// Delete a category
const deleteCategory = asyncHandler(async (req, res, next) => {
  const categoryId = req.params.id;
  const userId = req.user.id;
  const force = req.query.force === "true"; // Check if force parameter is provided

  console.log(
    `Attempting to delete category ${categoryId} by user ${userId}, force=${force}`
  );

  const category = await Category.getById(categoryId, userId);

  if (!category) {
    return next(new AppError("Category not found", 404));
  }

  // Handle case-insensitive property names
  const categoryUserId = category.user_id || category.USER_ID;

  // Check if it's a system category (null user_id)
  if (categoryUserId === null) {
    return next(new AppError("Cannot delete system categories", 403));
  }

  // Convert both to numbers to ensure accurate comparison
  if (Number(categoryUserId) !== Number(userId)) {
    return next(new AppError("Not authorized to delete this category", 403));
  }

  // Check for dependencies if not forcing deletion
  if (!force) {
    const dependencies = await Category.checkDependencies(categoryId);

    if (dependencies.hasDependencies) {
      // Return the dependency information for the frontend to handle confirmation
      return res.status(409).json({
        success: false,
        message: "Category is in use",
        data: dependencies,
        code: "CATEGORY_IN_USE",
      });
    }
  }

  // If no dependencies or force=true, proceed with deletion
  try {
    await Category.delete(categoryId, userId, force);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: {},
    });
  } catch (error) {
    console.error("Category deletion error:", error);

    if (error.code === "ORA-02292" || error.message.includes("constraint")) {
      return next(
        new AppError(
          "This category cannot be deleted because it is being used in transactions or budgets.",
          400
        )
      );
    } else if (error.message.includes("permission")) {
      return next(
        new AppError("Not authorized to delete this category", 403)
      );
    } else {
      // Provide a more detailed error message
      return next(
        new AppError(`Failed to delete category: ${error.message}`, 500)
      );
    }
  }
});

export {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
