// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle errors in async functions
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Different error handling for development and production
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
  } else {
    // Don't leak error details in production
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.code === 'ORA-01017') {
      error.message = 'Invalid database credentials';
      error.statusCode = 500;
    } else if (err.code === 'ORA-12154') {
      error.message = 'Database connection error';
      error.statusCode = 500;
    } else if (err.code === 'ORA-00001') {
      error.message = 'Unique constraint violation';
      error.statusCode = 400;
    } else if (err.code === 'ORA-02291') {
      error.message = 'Parent key not found';
      error.statusCode = 400;
    }

    return res.status(error.statusCode || 500).json({
      status: error.status || 'error',
      message: error.message || 'Something went wrong'
    });
  }
};

export { AppError, asyncHandler, errorHandler };