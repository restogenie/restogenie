import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const sales = await prisma.sale.findMany({
    where: { provider: 'smartro', order_name: { contains: '가라아게 오므라이스' } },
    orderBy: { created_at: 'desc' },
    take: 5,
    select: { created_at: true, order_name: true }
  })
  
  for (const sale of sales) {
      console.log(`[${sale.order_name}] created_at (DB string):`, sale.created_at.toISOString());
  }
}
main().finally(() => prisma.$disconnect());
