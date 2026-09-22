import { Router } from 'express';
import * as ctrl from '../controllers/contact.controller.js';
import { validate } from '../middleware/validate.js';
import { contactLimiter } from '../middleware/rateLimiter.js';
import { contactSchema } from '../validators/contact.validator.js';

const r = Router();
r.post('/', contactLimiter, validate(contactSchema), ctrl.submitContact);
export default r;
