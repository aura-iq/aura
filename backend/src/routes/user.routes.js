import { Router } from 'express';
import * as ctrl from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema, changePasswordSchema } from '../validators/user.validator.js';

const r = Router();
r.use(requireAuth);
r.get('/profile', ctrl.getProfile);
r.put('/profile', validate(updateProfileSchema), ctrl.updateProfile);
r.post('/change-password', validate(changePasswordSchema), ctrl.changePassword);
export default r;
