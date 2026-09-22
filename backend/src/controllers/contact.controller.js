import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const submitContact = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;
  const userId = req.user?.id || null;

  const created = await prisma.contactMessage.create({
    data: { name, email, message, userId },
  });

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map(a => ({
        userId: a.id,
        title: 'New contact message',
        body: name + ' (' + email + ') sent a message.',
        type: 'contact',
      })),
    });
  }

  res.status(201).json({
    success: true,
    data: { id: created.id, message: 'Message sent successfully' },
  });
});
