import { AppError } from '../utils/errorHandler.js';

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to access this resource', 403)
      );
    }
    next();
  };
};

export { authorize };