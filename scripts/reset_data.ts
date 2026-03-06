import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'park.yohan@ctrl-m.co.kr';
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log(`User ${email} not found.`);
        return;
    }

    const stores = await prisma.store.findMany({ where: { user_id: user.id } });

    if (stores.length === 0) {
        console.log(`No stores found for user ${email}.`);
        return;
    }

    for (const store of stores) {
        const storeId = store.id;
        console.log(`\nCleaning data for store: ${store.name} (ID: ${storeId})`);

        // Delete dependent tables first
        const deletedMenuItems = await prisma.menuLineItem.deleteMany({ where: { store_id: storeId } });
        console.log(`- Deleted ${deletedMenuItems.count} Menu Line Items`);

        const deletedSales = await prisma.sale.deleteMany({ where: { store_id: storeId } });
        console.log(`- Deleted ${deletedSales.count} Sales`);

        const deletedMappings = await prisma.menuMapping.deleteMany({ where: { store_id: storeId } });
        console.log(`- Deleted ${deletedMappings.count} Menu Mappings`);

        const deletedSystemLogs = await prisma.systemLog.deleteMany({ where: { store_id: storeId } });
        console.log(`- Deleted ${deletedSystemLogs.count} System Logs`);

        const deletedPos = await prisma.posConnection.deleteMany({ where: { store_id: storeId } });
        console.log(`- Deleted ${deletedPos.count} POS Connections`);

        console.log(`Finished cleaning store: ${store.name}`);
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
