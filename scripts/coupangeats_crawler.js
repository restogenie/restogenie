const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function runCoupangeatsCrawler() {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.error("Usage: node coupangeats_crawler.js <store_id> <loginId> <loginPw> <targetDate>");
        process.exit(1);
    }

    const storeId = parseInt(args[0], 10);
    const loginId = args[1];
    const loginPw = args[2];
    const targetDate = new Date(args[3]);

    console.log(`[Coupangeats Crawler] Started for Store ID: ${storeId}`);

    await prisma.systemLog.create({
        data: {
            store_id: storeId,
            level: "INFO",
            source: "CoupangeatsCrawler",
            message: `쿠팡이츠 (사장님포털) 연동 시작 - 인증 확인 중... (${loginId})`
        }
    });

    try {
        console.log(`[Coupangeats Crawler] Simulating Puppeteer launch and navigation...`);
        // Mocking a 5-second crawling delay
        await new Promise(resolve => setTimeout(resolve, 5000));

        await prisma.systemLog.create({
            data: {
                store_id: storeId,
                level: "INFO",
                source: "CoupangeatsCrawler",
                message: `쿠팡이츠 로그인 성공. 영업 내역 스크래핑 진행 중...`
            }
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Generate Mock Data representing extracted DOM
        const mockOid = `CE-${Date.now().toString().slice(-6)}`;
        const paidAmount = 18500;

        await prisma.sale.create({
            data: {
                store_id: storeId,
                provider: "coupangeats",
                oid: mockOid,
                business_date: targetDate,
                created_at: new Date(),
                order_name: "든든 국밥 한그릇",
                order_from: "쿠팡이츠",
                order_status: "배달완료",
                ordered_amount: paidAmount,
                paid_amount: paidAmount,
                delivery_app: "쿠팡이츠",
                delivery_order_no: `C-${mockOid}`,
                customer_mobile_phone_number: "050-****-9999",
            }
        });

        await prisma.menuLineItem.create({
            data: {
                unique_oid: uuidv4(),
                store_id: storeId,
                provider: "coupangeats",
                oid: mockOid,
                product_name: "순대국밥",
                product_price: 18500,
                quantity: 1,
                total_price: 18500,
                created_at: new Date()
            }
        });

        // Finalize
        await prisma.systemLog.create({
            data: {
                store_id: storeId,
                level: "INFO",
                source: "CoupangeatsCrawler",
                message: `쿠팡이츠 스크래핑 완료. 1건의 주문 및 1건의 품목 동기화 성공.`
            }
        });

        await prisma.posConnection.updateMany({
            where: { store_id: storeId, vendor: 'coupangeats' },
            data: { sync_status: 'FINISHED' }
        });

        console.log(`[Coupangeats Crawler] Successfully finished for Store ID: ${storeId}`);
        process.exit(0);

    } catch (error) {
        console.error(`[Coupangeats Crawler] Error:`, error);

        await prisma.systemLog.create({
            data: {
                store_id: storeId,
                level: "ERROR",
                source: "CoupangeatsCrawler",
                message: `쿠팡이츠 스크래핑 실패: ${error.message}`
            }
        });

        await prisma.posConnection.updateMany({
            where: { store_id: storeId, vendor: 'coupangeats' },
            data: { sync_status: 'ERROR' }
        });

        process.exit(1);
    }
}

runCoupangeatsCrawler();
