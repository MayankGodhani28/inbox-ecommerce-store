import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function bootstrapAdmin(params?: {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
}) {
  const args = process.argv.slice(2);
  const getArg = (key: string): string | undefined => {
    const idx = args.indexOf(`--${key}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const email = (params?.email || getArg('email') || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = params?.password || getArg('password') || process.env.ADMIN_PASSWORD || '';
  const name = (params?.name || getArg('name') || process.env.ADMIN_NAME || 'Store Administrator').trim();
  const phone = (params?.phone || getArg('phone') || process.env.ADMIN_PHONE || '').trim() || null;

  if (!email || !email.includes('@')) {
    console.error('[Admin Bootstrap] Error: A valid --email argument is required.');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('[Admin Bootstrap] Error: A secure --password with at least 8 characters is required. No default passwords are permitted.');
    process.exit(1);
  }

  console.log(`[Admin Bootstrap] Creating/updating administrator account for ${email}...`);

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      phone,
      passwordHash,
      role: Role.ADMIN,
    },
    create: {
      email,
      name,
      phone,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`[Admin Bootstrap] Successfully provisioned administrator (ID: ${admin.id}, Email: ${admin.email}, Role: ${admin.role})`);
  return admin;
}

if (process.argv[1] && process.argv[1].endsWith('bootstrapAdmin.ts')) {
  bootstrapAdmin()
    .catch((err) => {
      console.error('[Admin Bootstrap] Failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
