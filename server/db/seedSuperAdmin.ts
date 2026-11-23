import { prisma } from './prisma.js';
import bcrypt from 'bcryptjs';

async function setup() {
  const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@gmail.com').trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin2026!';
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('SUPER_ADMIN_PASSWORD must be at least 8 characters (72 UTF-8 bytes maximum)');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: { role: 'SUPER_ADMIN', name: 'Super Admin', passwordHash },
    create: {
      email,
      name: 'Super Admin',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('✓ Super Admin provisioned:', superAdmin.email, superAdmin.role);
}

void (async () => {
  try {
    await setup();
  } catch (err) {
    console.error('Setup error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
