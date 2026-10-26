import { prisma } from './prisma.js';
import bcrypt from 'bcryptjs';

async function setup() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Set SUPER_ADMIN_EMAIL and a unique SUPER_ADMIN_PASSWORD (12 characters minimum, 72 UTF-8 bytes maximum)');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: { role: 'SUPER_ADMIN', name: 'Executive Super Admin' },
    create: {
      email,
      name: 'Executive Super Admin',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('✓ Super Admin provisioned:', superAdmin.email, superAdmin.role);

  // Set admin@inbox.com to ADMIN role for store merchant operations
  await prisma.user.update({
    where: { email: 'admin@inbox.com' },
    data: { role: 'ADMIN' },
  }).catch(() => {});
  console.log('✓ admin@inbox.com configured as ADMIN');

  // Create 2 sample seller applications
  await prisma.sellerApplication.upsert({
    where: { id: 'app-demo-1' },
    update: {},
    create: {
      id: 'app-demo-1',
      storeName: 'Aura Sound & Tech',
      legalName: 'Aura Electronics Pvt. Ltd.',
      email: 'seller.aura@example.com',
      phone: '+91 98765 11223',
      businessAddress: 'Plot 42, Electronic City, Bengaluru, Karnataka, 560100',
      category: 'Electronics',
      taxId: 'GSTIN29AAACA1234A1Z5',
      description: 'Authorized distributor of wireless audio gear, audiophile headphones, and Bluetooth soundbars.',
      status: 'PENDING',
    },
  });

  await prisma.sellerApplication.upsert({
    where: { id: 'app-demo-2' },
    update: {},
    create: {
      id: 'app-demo-2',
      storeName: 'Urban Chic Apparel',
      legalName: 'Urban Chic Fashion Retail LLP',
      email: 'seller.urbanchic@example.com',
      phone: '+91 98765 44556',
      businessAddress: 'Sector 18, Commercial Hub, Gurugram, Haryana, 122002',
      category: 'Fashion',
      taxId: 'GSTIN06AABCU5678B1Z2',
      description: 'Contemporary streetwear brand with organic cotton tees, jackets, and urban denim.',
      status: 'PENDING',
    },
  });

  console.log('✓ Demo seller applications created in PENDING queue.');
}

setup()
  .catch((err) => {
    console.error('Setup error:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
