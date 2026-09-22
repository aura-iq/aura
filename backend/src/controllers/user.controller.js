import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, email: true, role: true, status: true, createdAt: true,
      profile: true,
    },
  });
  res.json({ success: true, data: { user } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, bio, phone, avatarUrl } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      profile: {
        update: {
          ...(fullName !== undefined && { fullName }),
          ...(bio !== undefined && { bio }),
          ...(phone !== undefined && { phone }),
          ...(avatarUrl !== undefined && { avatarUrl }),
        },
      },
    },
    select: {
      id: true, email: true,
      profile: { select: { fullName: true, bio: true, phone: true, avatarUrl: true } },
    },
  });

  res.json({ success: true, data: { user } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT');

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  res.json({ success: true, data: { message: 'Password changed, please login again' } });
});
