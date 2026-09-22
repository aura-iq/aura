import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import * as authService from '../services/auth.service.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../services/token.service.js';

const REFRESH_COOKIE = 'aura_rt';

const cookieOpts = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  const user = await authService.createUser({ email, password, fullName });

  const accessToken = signAccessToken(user);
  const { raw } = await issueRefreshToken(user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.cookie(REFRESH_COOKIE, raw, cookieOpts);
  res.status(201).json({ success: true, data: { user, accessToken } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.verifyCredentials(email, password);

  const accessToken = signAccessToken(user);
  const { raw } = await issueRefreshToken(user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.cookie(REFRESH_COOKIE, raw, cookieOpts);

  const safeUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, email: true, role: true, status: true, createdAt: true,
      profile: { select: { fullName: true, bio: true, phone: true, avatarUrl: true } },
    },
  });

  res.json({ success: true, data: { user: safeUser, accessToken } });
});

export const refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) throw new AppError('No session', 401, 'NO_SESSION');

  const user = await rotateRefreshToken(raw);
  if (!user) throw new AppError('Session expired', 401, 'REFRESH_INVALID');
  if (user.status !== 'ACTIVE') throw new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');

  const accessToken = signAccessToken(user);
  const { raw: newRaw } = await issueRefreshToken(user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.cookie(REFRESH_COOKIE, newRaw, cookieOpts);

  res.json({ success: true, data: { accessToken, user } });
});

export const logout = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (raw) await revokeRefreshToken(raw);
  res.clearCookie(REFRESH_COOKIE, { ...cookieOpts, maxAge: 0 });
  res.json({ success: true, data: { message: 'تم تسجيل الخروج' } });
});

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, email: true, role: true, status: true, createdAt: true,
      profile: { select: { fullName: true, bio: true, phone: true, avatarUrl: true } },
    },
  });
  res.json({ success: true, data: { user } });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.createPasswordResetToken(email);

  if (result) {
    console.log("[PASSWORD RESET] " + email + " -> token=" + result.raw);
  }

  res.json({
    success: true,
    data: { message: 'If the email exists, a reset link was sent' },
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  res.json({ success: true, data: { message: 'Password updated' } });
});
