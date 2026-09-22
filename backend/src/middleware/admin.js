import { AppError } from '../utils/AppError.js';

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'ADMIN') {
    return next(new AppError('Access forbidden', 403, 'FORBIDDEN'));
  }
  next();
}
