import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

async function main() {
    try {
        const stores = await prisma.store.findMany({
            where: { user_id: 1 },
            include: { pos_connections: true }
        });
        console.log("Success! Found stores:", stores.length);
    } catch (e) {
        console.error("Prisma Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
