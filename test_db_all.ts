import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const smartro = await prisma.sale.findMany({ where: { provider: 'smartro' }, orderBy: { created_at: 'desc' }, take: 2, select: { provider: true, created_at: true, order_name: true } })
  const payhere = await prisma.sale.findMany({ where: { provider: 'payhere' }, orderBy: { created_at: 'desc' }, take: 2, select: { provider: true, created_at: true, order_name: true } })
  const easypos = await prisma.sale.findMany({ where: { provider: 'easypos' }, orderBy: { created_at: 'desc' }, take: 2, select: { provider: true, created_at: true, order_name: true } })
  
  const all = [...smartro, ...payhere, ...easypos];
  for (const sale of all) {
      const createdAtUtc = new Date(sale.created_at);
      const kstDate = new Date(createdAtUtc.getTime() + 9 * 60 * 60 * 1000);
      const hourOfDay = kstDate.getUTCHours();
      console.log(`[${sale.provider}] [${sale.order_name}] DB:`, sale.created_at.toISOString(), `-> Plotted: Hour ${hourOfDay} KST`);
  }
}
main().finally(() => prisma.$disconnect());
