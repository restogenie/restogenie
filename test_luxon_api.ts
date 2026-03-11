import { PrismaClient } from '@prisma/client'
import { DateTime } from 'luxon'

const prisma = new PrismaClient()

async function main() {
  const sales = await prisma.sale.findMany({
    where: { provider: 'smartro' },
    orderBy: { created_at: 'desc' },
    take: 5,
    select: { order_name: true, created_at: true }
  });

  for (const sale of sales) {
      const dt = DateTime.fromJSDate(new Date(sale.created_at)).setZone('Asia/Seoul');
      const dayOfWeek = dt.weekday === 7 ? 0 : dt.weekday; // JS uses 0=Sun, Luxon uses 7=Sun
      const hourOfDay = dt.hour;
      
      console.log(`[Luxon Test] Order ${sale.order_name}: Raw created_at='${sale.created_at.toISOString()}', Extracted Hour=${hourOfDay} KST`);
  }
}
main().finally(() => prisma.$disconnect());
