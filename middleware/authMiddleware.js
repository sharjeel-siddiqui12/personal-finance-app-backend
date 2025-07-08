import jwt from "jsonwebtoken";
import { asyncHandler, AppError } from "../utils/errorHandler.js";
import User from "../models/User.js";

export const protect = asyncHandler(async (req, res, next) => {
  // 1) Get token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Not authorized to access this route", 401));
  }

  try {
    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Log for debugging
    console.log("Decoded token:", decoded);

    // 3) Check if user still exists
    const userFromDb = await User.findById(decoded.id); // Renamed to userFromDb for clarity
    console.log("Found user:", userFromDb);

    if (!userFromDb) {
      return next(
        new AppError("The user belonging to this token no longer exists", 401)
      );
    }

    // 4) Grant access to protected route
    // Populate req.user with necessary details from the user object fetched from the database
    req.user = {
      id: userFromDb.user_id, // Consistent with user_id from DB
      email: userFromDb.email, // Add email from DB user object
      username: userFromDb.username, // Add username from DB user object
      role: userFromDb.role, // Use role from DB user object for up-to-date info
    };
    // ...existing code...
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return next(new AppError("Not authorized to access this route", 401));
  }
});
