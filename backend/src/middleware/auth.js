import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch {
    throw new AppError('Session expired', 401, 'TOKEN_INVALID');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, status: true },
  });
  if (!user) throw new AppError('User not found', 401, 'USER_NOT_FOUND');
  if (user.status !== 'ACTIVE') throw new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');

  req.user = user;
  next();
});
