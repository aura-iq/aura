import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { hashToken } from './token.service.js';

export async function createUser({ email, password, fullName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already in use', 409, 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      profile: { create: { fullName } },
    },
    select: {
      id: true, email: true, role: true, status: true,
      profile: { select: { fullName: true } },
    },
  });
}

export async function verifyCredentials(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  if (user.status !== 'ACTIVE') throw new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  return user;
}

export async function createPasswordResetToken(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  return { raw, user };
}

export async function resetPassword(rawToken, newPassword) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('Link is invalid or expired', 400, 'RESET_INVALID');
  }

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
