import { prisma } from './prisma.js';
import bcrypt from 'bcryptjs';

async function setup() {
  const passwordHash = await bcrypt.hash('SuperAdmin2026!', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@inbox.com' },
    update: { role: 'SUPER_ADMIN', name: 'Executive Super Admin' },
    create: {
      email: 'superadmin@inbox.com',
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

(async () => {
  try {
    await setup();
  } catch (err) {
    console.error('Setup error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
