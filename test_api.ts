import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: { provider: 'smartro' },
    orderBy: { created_at: 'desc' },
    take: 5,
    select: { order_name: true, created_at: true }
  });

  for (const sale of sales) {
      const createdAtUtc = new Date(sale.created_at);
      const kstDate = new Date(createdAtUtc.getTime() + 9 * 60 * 60 * 1000);
      const dayOfWeek = kstDate.getUTCDay();
      const hourOfDay = kstDate.getUTCHours();
      console.log(`[API Test] Order ${sale.order_name}: Raw created_at='${sale.created_at.toISOString()}', Parsed kstDate='${kstDate.toISOString()}', Extracted Hour=${hourOfDay}`);
  }
}
main().finally(() => prisma.$disconnect());
