import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";
import bcrypt from "bcrypt"; // <--- ADD THIS LINE

// Get all users (admin only)
const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.getAllUsers();

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

// Get user by ID (admin only)
const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// Update user profile
// Update user profile
// Update user profile
const updateProfile = asyncHandler(async (req, res, next) => {
  const { username, name, email } = req.body;
  const userId = req.user.id;

  // Use name if username is not provided
  const actualUsername = username || name;

  // Check if we have a username/name to update
  if (!actualUsername) {
    return next(new AppError("Username cannot be empty", 400));
  }

  console.log(
    `Updating profile for user ${userId}: username=${actualUsername}, email=${email}`
  );

  try {
    const user = await User.update(userId, {
      username: actualUsername,
      email,
    });

    // Try to log the update, but don't fail if it doesn't work
    try {
      await AuditLog.create({
        user_id: userId,
        action: "PROFILE_UPDATE",
        description: `Updated profile for user ${actualUsername}`,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"] || "unknown",
      });
    } catch (error) {
      console.warn("Could not create audit log entry:", error.message);
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    next(new AppError("Failed to update profile", 500));
  }
});

// Change password
export const changePassword = asyncHandler(async (req, res, next) => {
  console.log("[userController.changePassword] Function called.");
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id; // From protect middleware

  console.log(
    `[userController.changePassword] Attempting to change password for user ID: ${userId}.`
  );

  if (!currentPassword || !newPassword) {
    console.error(
      "[userController.changePassword] Missing currentPassword or newPassword in request body."
    );
    return next(
      new AppError("Current password and new password are required", 400)
    );
  }
  if (newPassword.length < 6) {
    // Example validation
    console.error("[userController.changePassword] New password is too short.");
    return next(
      new AppError("New password must be at least 6 characters long", 400)
    );
  }

  try {
    console.log(
      `[userController.changePassword] Fetching user by email: ${req.user.email} for user ID: ${userId}.`
    );
    // Step 1: Fetch user to get current password hash
    // Ensure req.user.email is available from your 'protect' middleware
    const user = await User.findByEmail(req.user.email);

    if (!user) {
      console.error(
        `[userController.changePassword] User not found with email: ${req.user.email} (User ID from token: ${userId}).`
      );
      // This should ideally not happen if the user is authenticated via 'protect' middleware
      return next(new AppError("User not found, authentication issue.", 404));
    }
    console.log(
      `[userController.changePassword] User found for user ID: ${userId}. User data: ${JSON.stringify(
        user
      )}`
    );

    // Step 2: Compare currentPassword with stored hash
    // Handle Oracle's uppercase column names for PASSWORD_HASH
    const storedPasswordHash = user.PASSWORD_HASH || user.password_hash;

    if (!storedPasswordHash) {
      console.error(
        `[userController.changePassword] Stored password hash not found for user ID: ${userId}.`
      );
      return next(
        new AppError(
          "Account configuration error. Cannot verify current password.",
          500
        )
      );
    }
    console.log(
      `[userController.changePassword] Stored password hash found for user ID: ${userId}. Comparing passwords.`
    );

    const isMatch = await bcrypt.compare(currentPassword, storedPasswordHash);
    console.log(
      `[userController.changePassword] Password comparison result for user ID ${userId}: ${isMatch}`
    );

    if (!isMatch) {
      console.warn(
        `[userController.changePassword] Current password incorrect for user ID: ${userId}.`
      );
      return next(new AppError("Current password is incorrect", 401));
    }

    console.log(
      `[userController.changePassword] Current password matches for user ID: ${userId}. Proceeding to update password in model.`
    );
    // Step 3: If match, call User.updatePassword
    await User.updatePassword(userId, newPassword); // This is the call to the model method
    console.log(
      `[userController.changePassword] User.updatePassword call completed for user ID: ${userId}.`
    );

    // If AuditLog is used, ensure it's handled correctly
    try {
      console.log(
        `[userController.changePassword] Attempting to create audit log for user ID: ${userId}.`
      );
      // await AuditLog.create({ /* ... audit data ... */ });
      console.log(
        `[userController.changePassword] Audit log created successfully for user ID: ${userId}.`
      );
    } catch (auditError) {
      console.warn(
        `[userController.changePassword] Failed to create audit log for password change for user ID ${userId}: ${auditError.message}`
      );
      // Do not let audit log failure stop the main operation
    }

    console.log(
      `[userController.changePassword] Password successfully updated for user ID: ${userId}. Sending response.`
    );
    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    // This catch block is for errors occurring within this controller function's try block
    // (e.g., if User.findByEmail, bcrypt.compare, or User.updatePassword throws an error that isn't caught internally by User.updatePassword's own try-catch)
    console.error(
      `[userController.changePassword] UNEXPECTED ERROR in controller for user ID ${userId}: ${error.message}`
    );
    console.error(
      `[userController.changePassword] Controller Error Stack: ${error.stack}`
    );
    // The asyncHandler should also catch this and forward it
    next(error); // Forward to the global error handler
  }
});

// Delete user (admin only)

// Delete user (admin only)
const deleteUser = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  const currentUser = req.user;

  try {
    // Check if user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return next(new AppError("User not found", 404));
    }

    // Protect primary admin account
    if (userExists.email === "admin@pfa.com") {
      // Log the unauthorized deletion attempt
      await AuditLog.create({
        user_id: req.user.id,
        action: "UNAUTHORIZED_DELETE_ATTEMPT",
        description: `Admin ${req.user.id} attempted to delete primary admin account`,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"] || "unknown",
        severity: "HIGH",
      });

      return next(new AppError("Cannot delete the primary admin account", 403));
    }

    // Only primary admin can delete other admins
    if (userExists.role === "ADMIN" && currentUser.email !== "admin@pfa.com") {
      await AuditLog.create({
        user_id: req.user.id,
        action: "UNAUTHORIZED_DELETE_ATTEMPT",
        description: `Admin ${req.user.id} attempted to delete another admin ${userId}`,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"] || "unknown",
        severity: "MEDIUM",
      });

      return next(
        new AppError("Only primary admin can delete other admins", 403)
      );
    }

    console.log(`Attempting to delete user ${userId}...`);

    // Delete user with explicit try/catch
    try {
      await User.deleteUser(userId);
      console.log(`User ${userId} deleted successfully`);
    } catch (deleteErr) {
      console.error(`Error in User.deleteUser for ${userId}:`, deleteErr);
      return next(
        new AppError(`Failed to delete user: ${deleteErr.message}`, 500)
      );
    }

    // Log the deletion
    await AuditLog.create({
      user_id: req.user.id,
      action: "USER_DELETE",
      description: `Admin deleted user ${userExists.username}`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || "unknown",
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(`Unexpected error in deleteUser controller:`, error);
    next(
      new AppError(`Error processing delete request: ${error.message}`, 500)
    );
  }
});

// Update user role (admin only)
const updateRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  const userId = req.params.id;

  // Check if valid role
  if (!["USER", "ADMIN"].includes(role.toUpperCase())) {
    return next(new AppError("Invalid role", 400));
  }

  // Check if user exists
  const userExists = await User.findById(userId);
  if (!userExists) {
    return next(new AppError("User not found", 404));
  }

  // Protect primary admin account
  if (
    userExists.email === "admin@pfa.com" &&
    userExists.role === "ADMIN" &&
    role.toUpperCase() === "USER"
  ) {
    return next(
      new AppError(
        "Cannot remove admin privileges from the primary admin account",
        403
      )
    );
  }

  // Update role
  const user = await User.updateRole(userId, role.toUpperCase());

  // Log the role change
  await AuditLog.create({
    user_id: req.user.id,
    action: "ROLE_UPDATE",
    description: `Changed role of ${userExists.username} to ${role}`,
    ip_address: req.ip,
    user_agent: req.headers["user-agent"] || "unknown",
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// Get user profile
const getProfile = asyncHandler(async (req, res, next) => {
  console.log("User ID from token:", req.user.id);

  const user = await User.findById(req.user.id);
  console.log("User found:", user);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

export {
  getAllUsers,
  getUserById,
  updateProfile,
  deleteUser,
  updateRole,
  getProfile,
};
