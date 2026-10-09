import { Router } from 'express';
import * as ctrl from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

r.use(requireAuth);

r.get('/my', ctrl.getMyThread);
r.post('/send', ctrl.sendMessage);
r.post('/close', ctrl.closeMyThread);

export default r;
