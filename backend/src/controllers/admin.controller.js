import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getStats = asyncHandler(async (_req, res) => {
  const users = await prisma.user.count();
  const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
  const suspended = await prisma.user.count({ where: { status: 'SUSPENDED' } });
  const messages = await prisma.contactMessage.count();
  const unreadMessages = await prisma.contactMessage.count({ where: { isRead: false } });
  const notifications = await prisma.notification.count({ where: { isRead: false } });
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newUsers7d = await prisma.user.count({ where: { createdAt: { gte: since } } });
  res.json({
    success: true,
    data: { users, admins, suspended, messages, unreadMessages, notifications, newUsers7d },
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const q = req.query.q || '';
  const take = Math.min(limit, 100);
  const skip = (Math.max(page, 1) - 1) * take;
  const where = q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { profile: { fullName: { contains: q, mode: 'insensitive' } } }] } : {};
  const items = await prisma.user.findMany({
    where, skip, take,
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, role: true, status: true, createdAt: true, profile: { select: { fullName: true, phone: true } } },
  });
  const total = await prisma.user.count({ where });
  res.json({ success: true, data: { items, total, page: Number(page), pages: Math.ceil(total / take) } });
});

export const setUserStatus = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const status = req.body.status;
  if (status !== 'ACTIVE' && status !== 'SUSPENDED') throw new AppError('Invalid status', 400, 'BAD_STATUS');
  if (id === req.user.id && status === 'SUSPENDED') throw new AppError('Cannot suspend yourself', 400, 'SELF_SUSPEND');
  const updated = await prisma.user.update({ where: { id }, data: { status }, select: { id: true, email: true, status: true } });
  if (status === 'SUSPENDED') {
    await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  res.json({ success: true, data: { user: updated } });
});

export const setUserRole = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const role = req.body.role;
  if (role !== 'USER' && role !== 'ADMIN') throw new AppError('Invalid role', 400, 'BAD_ROLE');
  if (id === req.user.id && role !== 'ADMIN') throw new AppError('Cannot demote yourself', 400, 'SELF_DEMOTE');
  const updated = await prisma.user.update({ where: { id }, data: { role }, select: { id: true, email: true, role: true } });
  res.json({ success: true, data: { user: updated } });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (id === req.user.id) throw new AppError('Cannot delete yourself', 400, 'SELF_DELETE');
  await prisma.user.delete({ where: { id } });
  res.json({ success: true, data: { message: 'Deleted' } });
});

export const listMessages = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const unread = req.query.unread;
  const take = Math.min(limit, 100);
  const skip = (Math.max(page, 1) - 1) * take;
  const where = unread === 'true' ? { isRead: false } : {};
  const items = await prisma.contactMessage.findMany({
    where, skip, take,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, email: true } } },
  });
  const total = await prisma.contactMessage.count({ where });
  res.json({ success: true, data: { items, total, page: Number(page), pages: Math.ceil(total / take) } });
});

export const markMessageRead = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const updated = await prisma.contactMessage.update({ where: { id }, data: { isRead: true } });
  res.json({ success: true, data: { message: updated } });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  await prisma.contactMessage.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: { message: 'Deleted' } });
});

export const broadcastNotification = asyncHandler(async (req, res) => {
  const title = req.body.title;
  const body = req.body.body;
  const role = req.body.role;
  let where = {};
  if (role === 'USER' || role === 'ADMIN') {
    where = { role: role };
  }
  const users = await prisma.user.findMany({ where, select: { id: true } });
  if (users.length === 0) return res.json({ success: true, data: { created: 0 } });
  await prisma.notification.createMany({
    data: users.map(u => ({ userId: u.id, title, body, type: 'broadcast' })),
  });
  res.json({ success: true, data: { created: users.length } });
});
