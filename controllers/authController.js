import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import bcrypt from "bcrypt"; // Add this import
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwtUtils.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";

// Register a new user
const register = asyncHandler(async (req, res, next) => {
  // Extract name OR username, allowing for either field name
  const { username, name, email, password } = req.body;

  // Use username if provided, otherwise use name
  const actualUsername = username || name;

  // Check if username is provided
  if (!actualUsername) {
    return next(new AppError("Username is required", 400));
  }

  // Check if user already exists
  const userExists = await User.findByEmail(email);
  if (userExists) {
    return next(new AppError("User with this email already exists", 400));
  }

  // Create user
  const user = await User.create({
    username: actualUsername,
    email,
    password,
  });

  // Try to create audit log but don't fail if it doesn't work
  try {
    await AuditLog.create({
      user_id: user.user_id,
      action: "REGISTER",
      description: "User registration",
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || "unknown",
    });
  } catch (error) {
    console.warn("Could not create audit log entry:", error.message);
    // Continue with registration process even if audit log fails
  }

  // Generate token
  const token = generateToken(user.user_id, user.role);
  const refreshToken = generateRefreshToken(user.user_id);

  res.status(201).json({
    success: true,
    token,
    refreshToken,
    user: {
      id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});

// Login user
const login = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Get password hash accounting for Oracle's uppercase column names
    const passwordHash = user.PASSWORD_HASH || user.password_hash;

    if (!passwordHash) {
      console.error("Password hash is missing for user:", email);
      return next(
        new AppError("Account error. Please reset your password.", 500)
      );
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Update the last login time
    // Inside your login controller function, after password verification:
    try {
      await User.updateLastLogin(user.USER_ID);
      console.log(`Updated last login for user ${user.USER_ID}`);
    } catch (error) {
      console.error("Failed to update last login time:", error);
      // Continue with login process even if this fails
    }

    // Skipping audit logging to avoid errors

    // Generate token
    const userId = user.USER_ID || user.user_id;
    const userRole = user.ROLE || user.role;
    const token = generateToken(userId, userRole);
    const refreshToken = generateRefreshToken(userId);

    console.log("Login successful for user:", email);

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: userId,
        username: user.USERNAME || user.username,
        email: user.EMAIL || user.email,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return next(new AppError("An unexpected error occurred during login", 500));
  }
});

// Refresh token
const refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return next(new AppError("Refresh token is required", 400));
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError("Invalid refresh token", 401));
    }

    // Generate new tokens
    const newToken = generateToken(user.user_id, user.role);
    const newRefreshToken = generateRefreshToken(user.user_id);

    res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return next(new AppError("Invalid refresh token", 401));
  }
});

// Get current user
const getCurrentUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// Logout user
const logout = asyncHandler(async (req, res, next) => {
  // In a stateless JWT auth system, the client just needs to remove the token
  // But we can log the logout event
  if (req.user && req.user.id) {
    await AuditLog.create({
      user_id: req.user.id,
      action: "LOGOUT",
      description: "User logged out",
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || "unknown",
    });
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

export { register, login, refreshToken, getCurrentUser, logout };
