import { prisma } from '../db/prisma.js';

async function main() {
  const asdUser = await prisma.user.findFirst({ where: { email: 'mayankgodhani222@gmail.com' } });
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@inbox.com' } });

  console.log(`User 'asd asd': ID = ${asdUser?.id}, Email = ${asdUser?.email}, Role = ${asdUser?.role}`);
  console.log(`User 'admin': ID = ${adminUser?.id}, Email = ${adminUser?.email}, Role = ${adminUser?.role}`);

  const asdOrders = await prisma.order.findMany({
    where: {
      OR: [
        { customerEmail: 'mayankgodhani222@gmail.com' },
        { customerName: { contains: 'asd', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      customerName: true,
      customerEmail: true,
      status: true
    }
  });

  console.log('\n=== ORDERS WITH "asd asd" OR "mayankgodhani222@gmail.com" ===');
  for (const o of asdOrders) {
    const isOwnedByAsd = o.userId === asdUser?.id;
    const isOwnedByAdmin = o.userId === adminUser?.id;
    const owner = isOwnedByAsd ? 'asd asd (Customer)' : isOwnedByAdmin ? 'admin@inbox.com (Admin)' : o.userId;
    console.log(`Order Number: ${o.orderNumber} | Customer on Form: "${o.customerName}" (${o.customerEmail}) | Actual DB Owner (userId): ${owner}`);
  }
}

main().catch((error) => { console.error('Order diagnosis failed:', error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
