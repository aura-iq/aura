import { Router } from 'express';
import * as ctrl from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const r = Router();

r.use(requireAuth, requireAdmin);

r.get('/threads', ctrl.listThreads);
r.get('/threads/:id', ctrl.getThread);
r.post('/threads/:id/reply', ctrl.replyToThread);

export default r;
