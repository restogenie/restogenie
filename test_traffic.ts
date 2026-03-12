import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testTraffic() {
    try {
        const storeId = 1; // Assuming 1 exists, or we can check
        const store = await prisma.store.findFirst();
        console.log("Found Store:", store?.name, "(ID:", store?.id, ")");
        
        if (!store) {
            console.log("No store found to test");
            return;
        }

        const sid = store.id;

        const traffics = await prisma.footTraffic.findMany({
            where: {
                store_id: sid
            }
        });
        console.log("Found Traffics:", traffics.length);

        const salesCount = await prisma.sale.count({
            where: {
                store_id: sid,
                business_date: {
                    gte: new Date('2020-01-01'),
                    lte: new Date('2030-01-01')
                }
            }
        });
        console.log("Sales count query works:", salesCount);

        const salesGroup = await prisma.sale.groupBy({
            by: ['business_date'],
            where: {
                store_id: sid,
            },
            _sum: { paid_amount: true },
            _count: { _all: true }
        });
        console.log("Sales groupBy works:", salesGroup.length);

        const trafficGroup = await prisma.footTraffic.groupBy({
            by: ['visit_date', 'widget_name'],
            where: {
                store_id: sid,
            },
            _sum: { visit_count: true }
        });
        console.log("Traffic groupBy works:", trafficGroup.length);

        const passByCount = traffics.filter((t: any) => t.widget_name === "유동인구").reduce((acc: number, t: any) => acc + t.visit_count, 0);
        console.log("PassBy calculated");

    } catch (e) {
        console.error("Test Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

testTraffic();
