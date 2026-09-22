import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl }
  );
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function issueRefreshToken(userId, options) {
  const ip = options && options.ip;
  const userAgent = options && options.userAgent;
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt, ip, userAgent },
  });
  return { raw, expiresAt };
}

export async function rotateRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing) return null;
  if (existing.revokedAt) return null;
  if (existing.expiresAt < new Date()) return null;

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  return prisma.user.findUnique({
    where: { id: existing.userId },
    select: { id: true, email: true, role: true, status: true },
  });
}

export async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
