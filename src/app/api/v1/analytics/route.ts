import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export async function GET(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Could not validate credentials" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const storeIdParam = searchParams.get("store_id");
        if (!storeIdParam) {
            return NextResponse.json({ detail: "store_id is required" }, { status: 400 });
        }

        const storeId = parseInt(storeIdParam, 10);

        // Authorization check
        const store = await prisma.store.findFirst({
            where: { id: storeId, user_id: user.id }
        });

        const storeMember = await prisma.storeMember.findFirst({
            where: { store_id: storeId, user_id: user.id }
        });

        if (!store && !storeMember) {
            return NextResponse.json({ detail: "Forbidden access to this store" }, { status: 403 });
        }

        const startDateParam = searchParams.get("start_date");
        const endDateParam = searchParams.get("end_date");

        if (!startDateParam || !endDateParam) {
            return NextResponse.json({ detail: "start_date and end_date are required" }, { status: 400 });
        }

        // 1. Fetch Sales with Menu Items
        const sales = await prisma.sale.findMany({
            where: {
                store_id: storeId,
                business_date: {
                    gte: new Date(startDateParam),
                    lte: new Date(endDateParam)
                }
            },
            include: { menu_items: true }
        });

        // 2. Aggregate Data in Memory

        // A. Revenue Trend (by Date)
        const revenueTrendMap: Record<string, { date: string; revenue: number; orders: number }> = {};

        // B. Day & Hour Heatmap (0=Sun..6=Sat, 0..23 hours)
        const heatmap: Record<number, Record<number, number>> = {};
        for (let d = 0; d < 7; d++) {
            heatmap[d] = {};
            for (let h = 0; h < 24; h++) heatmap[d][h] = 0;
        }

        // C. Payment Methods
        let totalPaid = 0;
        let totalPoint = 0;
        let totalPrepaid = 0;

        // D. Channels
        const channelsMap: Record<string, number> = {};

        // E. Menu Product Map
        const menuABCMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

        let totalRevenueOverall = 0;

        sales.forEach(sale => {
            // Revenue Trend
            const dateStr = sale.business_date.toISOString().split('T')[0];
            if (!revenueTrendMap[dateStr]) {
                revenueTrendMap[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
            }
            revenueTrendMap[dateStr].revenue += sale.paid_amount;
            revenueTrendMap[dateStr].orders += 1;
            totalRevenueOverall += sale.paid_amount;

            // Heatmap
            const createdAt = new Date(sale.created_at);
            const dayOfWeek = createdAt.getDay(); // 0-6
            const hourOfDay = createdAt.getHours(); // 0-23
            heatmap[dayOfWeek][hourOfDay] += sale.paid_amount;

            // Payment Methods
            totalPaid += sale.paid_amount;
            totalPoint += sale.point_used_amount;
            totalPrepaid += sale.prepaid_used_amount;

            // Channels
            const channel = sale.delivery_app || sale.order_from || '방문/포장';
            channelsMap[channel] = (channelsMap[channel] || 0) + sale.paid_amount;

            // Menu Items (ABC)
            sale.menu_items.forEach(menu => {
                // If refund, the price and pos quantity are negative. Add them to track net.
                if (menu.product_price === 0 && menu.total_price === 0) return; // skip 0-won opts if any
                const targetName = menu.product_name || '알수없음';

                if (!menuABCMap[targetName]) {
                    menuABCMap[targetName] = { name: targetName, quantity: 0, revenue: 0 };
                }
                menuABCMap[targetName].quantity += menu.quantity;
                menuABCMap[targetName].revenue += menu.total_price;
            });
        });

        // Finalize Heatmap Array Format
        const dayHourHeatmap: any[] = [];
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        for (let d = 0; d < 7; d++) {
            for (let h = 0; h < 24; h++) {
                if (heatmap[d][h] > 0) {
                    dayHourHeatmap.push({
                        dayIndex: d,
                        dayName: days[d],
                        hour: h,
                        revenue: heatmap[d][h]
                    });
                }
            }
        }

        // Finalize Channels Array
        const channels = Object.keys(channelsMap).map(k => ({
            name: k,
            value: channelsMap[k]
        })).sort((a, b) => b.value - a.value);

        // Finalize Payment Method Array
        const paymentMethods = [
            { name: '신용카드/현금상당액', value: totalPaid },
            { name: '포인트 결제', value: totalPoint },
            { name: '선불권 결제', value: totalPrepaid }
        ].filter(p => p.value > 0);

        // Calculate ABC Analysis
        const menuArray = Object.values(menuABCMap)
            .filter(m => m.revenue > 0) // Hide negative/zero items from refund nets overriding sales if any
            .sort((a, b) => b.revenue - a.revenue);

        let cumulativeRevenue = 0;
        const totalMenuRevenue = menuArray.reduce((acc, curr) => acc + curr.revenue, 0);

        const abcAnalysis = menuArray.map(menu => {
            cumulativeRevenue += menu.revenue;
            const cumulativePercent = (cumulativeRevenue / totalMenuRevenue) * 100;

            let grade = 'C';
            if (cumulativePercent <= 70) grade = 'A';
            else if (cumulativePercent <= 90) grade = 'B';

            return {
                ...menu,
                cumulativePercent,
                grade
            };
        });

        return NextResponse.json({
            status: "success",
            data: {
                totalRevenue: totalRevenueOverall,
                revenueTrend: Object.values(revenueTrendMap).sort((a, b) => a.date.localeCompare(b.date)),
                dayHourHeatmap,
                channels,
                paymentMethods,
                abcAnalysis
            }
        });

    } catch (error: any) {
        console.error("Analytics API Error:", error);
        return NextResponse.json(
            { status: "error", message: "Failed to fetch analytics." },
            { status: 500 }
        );
    }
}
