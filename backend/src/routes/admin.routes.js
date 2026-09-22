import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const r = Router();
r.use(requireAuth, requireAdmin);
r.get('/stats', ctrl.getStats);
r.get('/users', ctrl.listUsers);
r.patch('/users/:id/status', ctrl.setUserStatus);
r.patch('/users/:id/role', ctrl.setUserRole);
r.delete('/users/:id', ctrl.deleteUser);
r.get('/messages', ctrl.listMessages);
r.patch('/messages/:id/read', ctrl.markMessageRead);
r.delete('/messages/:id', ctrl.deleteMessage);
r.post('/notifications/broadcast', ctrl.broadcastNotification);
export default r;
