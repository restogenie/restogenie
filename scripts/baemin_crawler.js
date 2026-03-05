const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function runBaeminCrawler() {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.error("Usage: node baemin_crawler.js <store_id> <loginId> <loginPw> <targetDate>");
        process.exit(1);
    }

    const storeId = parseInt(args[0], 10);
    const loginId = args[1];
    const loginPw = args[2];
    const targetDate = new Date(args[3]);

    console.log(`[Baemin Crawler] Started for Store ID: ${storeId}`);

    // 1. Mark as SYNCING and write start log
    await prisma.systemLog.create({
        data: {
            store_id: storeId,
            level: "INFO",
            source: "BaeminCrawler",
            message: `배달의민족 (사장님광장) 연동 시작 - 인증 확인 중... (${loginId})`
        }
    });

    try {
        // --- 2. Simulate Headless Browser Crawling (Puppeteer) ---
        // In a real scenario, we launch puppeteer here, navigate to baemin CEO portal, 
        // login, solve captchas if needed, jump to 'Sales History', extract the JSON/HTML table,
        // and map it to our schema.

        console.log(`[Baemin Crawler] Simulating Puppeteer launch and navigation...`);
        // Mocking a 5-second crawling delay
        await new Promise(resolve => setTimeout(resolve, 5000));

        await prisma.systemLog.create({
            data: {
                store_id: storeId,
                level: "INFO",
                source: "BaeminCrawler",
                message: `배달의민족 로그인 성공. 영업 내역 스크래핑 진행 중...`
            }
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        // 3. Generate Mock Data representing extracted DOM
        const mockOid = `BM-${Date.now().toString().slice(-6)}`;
        const paidAmount = 25000;

        await prisma.sale.create({
            data: {
                store_id: storeId,
                provider: "baemin",
                oid: mockOid,
                business_date: targetDate,
                created_at: new Date(),
                order_name: "배민 1인 보쌈 정식 외 1건",
                order_from: "배달의민족",
                order_status: "배달완료",
                ordered_amount: paidAmount,
                paid_amount: paidAmount,
                delivery_app: "배달의민족",
                delivery_order_no: `B-${mockOid}`,
                customer_mobile_phone_number: "050-****-1234",
            }
        });

        await prisma.menuLineItem.createMany({
            data: [
                {
                    unique_oid: uuidv4(),
                    store_id: storeId,
                    provider: "baemin",
                    oid: mockOid,
                    product_name: "1인 보쌈 정식",
                    product_price: 15000,
                    quantity: 1,
                    total_price: 15000,
                    created_at: new Date()
                },
                {
                    unique_oid: uuidv4(),
                    store_id: storeId,
                    provider: "baemin",
                    oid: mockOid,
                    product_name: "막국수 (소)",
                    product_price: 10000,
                    quantity: 1,
                    total_price: 10000,
                    created_at: new Date()
                }
            ]
        });

        // 4. Finalize
        await prisma.systemLog.create({
            data: {
                store_id: storeId,
                level: "INFO",
                source: "BaeminCrawler",
                message: `배달의민족 스크래핑 완료. 1건의 주문 및 2건의 품목 동기화 성공.`
            }
        });

        await prisma.posConnection.updateMany({
            where: { store_id: storeId, vendor: 'baemin' },
            data: { sync_status: 'FINISHED' }
        });

        console.log(`[Baemin Crawler] Successfully finished for Store ID: ${storeId}`);
        process.exit(0);

    } catch (error) {
        console.error(`[Baemin Crawler] Error:`, error);

        await prisma.systemLog.create({
            data: {
                store_id: storeId,
                level: "ERROR",
                source: "BaeminCrawler",
                message: `배달의민족 스크래핑 실패: ${error.message}`
            }
        });

        await prisma.posConnection.updateMany({
            where: { store_id: storeId, vendor: 'baemin' },
            data: { sync_status: 'ERROR' }
        });

        process.exit(1);
    }
}

runBaeminCrawler();
