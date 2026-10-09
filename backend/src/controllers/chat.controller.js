import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getMyThread = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  let thread = await prisma.chatThread.findFirst({
    where: { userId, status: 'open' },
    orderBy: { lastMessage: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 200,
      },
    },
  });

  if (!thread) {
    thread = await prisma.chatThread.create({
      data: { userId },
      include: { messages: true },
    });
  }

  res.json({ success: true, data: { thread } });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const text = (req.body.text || '').trim();

  if (!text || text.length < 1) {
    throw new AppError('الرسالة فارغة', 400, 'EMPTY_MESSAGE');
  }
  if (text.length > 2000) {
    throw new AppError('الرسالة طويلة جداً', 400, 'TOO_LONG');
  }

  let thread = await prisma.chatThread.findFirst({
    where: { userId, status: 'open' },
    orderBy: { lastMessage: 'desc' },
  });

  if (!thread) {
    thread = await prisma.chatThread.create({ data: { userId } });
  }

  const message = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      senderId: userId,
      text,
      isFromAdmin: false,
    },
  });

  await prisma.chatThread.update({
    where: { id: thread.id },
    data: { lastMessage: new Date() },
  });

  res.status(201).json({ success: true, data: { message } });
});

export const closeMyThread = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await prisma.chatThread.updateMany({
    where: { userId, status: 'open' },
    data: { status: 'closed' },
  });
  res.json({ success: true, data: { message: 'تم إغلاق المحادثة' } });
});

export const listThreads = asyncHandler(async (req, res) => {
  const threads = await prisma.chatThread.findMany({
    orderBy: { lastMessage: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const result = threads.map(function(t) {
    return {
      id: t.id,
      status: t.status,
      lastMessage: t.lastMessage,
      createdAt: t.createdAt,
      user: t.user,
      lastText: t.messages[0] ? t.messages[0].text : '',
    };
  });

  res.json({ success: true, data: { threads: result } });
});

export const getThread = asyncHandler(async (req, res) => {
  const threadId = req.params.id;

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!thread) throw new AppError('المحادثة غير موجودة', 404, 'NOT_FOUND');

  await prisma.chatMessage.updateMany({
    where: { threadId, isFromAdmin: false, isRead: false },
    data: { isRead: true },
  });

  res.json({ success: true, data: { thread } });
});

export const replyToThread = asyncHandler(async (req, res) => {
  const threadId = req.params.id;
  const text = (req.body.text || '').trim();

  if (!text || text.length < 1) {
    throw new AppError('الرسالة فارغة', 400, 'EMPTY_MESSAGE');
  }
  if (text.length > 2000) {
    throw new AppError('الرسالة طويلة جداً', 400, 'TOO_LONG');
  }

  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) throw new AppError('المحادثة غير موجودة', 404, 'NOT_FOUND');

  const message = await prisma.chatMessage.create({
    data: {
      threadId,
      senderId: req.user.id,
      text,
      isFromAdmin: true,
    },
  });

  await prisma.chatThread.update({
    where: { id: threadId },
    data: { lastMessage: new Date(), status: 'open' },
  });

  res.status(201).json({ success: true, data: { message } });
});
