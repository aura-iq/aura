import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);
r.get('/', ctrl.listNotifications);
r.post('/:id/read', ctrl.markRead);
r.post('/read-all', ctrl.markAllRead);
export default r;
