import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';
import {
  registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
} from '../validators/auth.validator.js';

const r = Router();

r.post('/register', authLimiter, validate(registerSchema), ctrl.register);
r.post('/login', authLimiter, validate(loginSchema), ctrl.login);
r.post('/refresh', ctrl.refresh);
r.post('/logout', ctrl.logout);
r.get('/me', requireAuth, ctrl.me);
r.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
r.post('/reset-password', authLimiter, validate(resetPasswordSchema), ctrl.resetPassword);

export default r;
