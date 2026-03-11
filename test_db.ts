import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const sales = await prisma.sale.findMany({
    where: { provider: 'smartro' },
    orderBy: { created_at: 'desc' },
    take: 5,
    select: { created_at: true, order_name: true }
  })
  
  for (const sale of sales) {
      const createdAtUtc = new Date(sale.created_at);
      const kstDate = new Date(createdAtUtc.getTime() + 9 * 60 * 60 * 1000);
      const hourOfDay = kstDate.getUTCHours();
      console.log(`[${sale.order_name}] created_at (DB string):`, sale.created_at.toISOString(), 
                  `\n -> created_at.getTime():`, createdAtUtc.getTime(),
                  `\n -> kstDate:`, kstDate.toISOString(),
                  `\n -> Plotted Hour:`, hourOfDay);
  }
}
main().finally(() => prisma.$disconnect());
