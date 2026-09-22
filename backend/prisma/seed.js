import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@aura.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12);

  const passwordHash = await bcrypt.hash(password, rounds);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      profile: { create: { fullName: 'Admin' } },
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: 'Welcome to Aura',
      body: 'Admin account created successfully.',
      type: 'welcome',
    },
  });

  console.log('Admin seeded:', email, '/', password);
}

main().finally(() => prisma.$disconnect());
