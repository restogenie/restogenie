import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { DateTime } from "luxon";

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

        const currentStart = new Date(startDateParam);
        const currentEnd = new Date(endDateParam);
        currentEnd.setUTCHours(23, 59, 59, 999);

        // Calculate offset periods
        const diffTime = Math.abs(currentEnd.getTime() - currentStart.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // WoW (Week over Week) - exact 7 days ago
        const wowStart = new Date(currentStart);
        wowStart.setDate(wowStart.getDate() - 7);
        const wowEnd = new Date(currentEnd);
        wowEnd.setDate(wowEnd.getDate() - 7);

        // MoM (Month over Month) - roughly 30 days ago
        const momStart = new Date(currentStart);
        momStart.setMonth(momStart.getMonth() - 1);
        const momEnd = new Date(currentEnd);
        momEnd.setMonth(momEnd.getMonth() - 1);

        // Same Day Last Week (for single day selections usually, or corresponding period)
        const sdlwStart = new Date(currentStart);
        sdlwStart.setDate(sdlwStart.getDate() - 7);
        const sdlwEnd = new Date(currentEnd);
        sdlwEnd.setDate(sdlwEnd.getDate() - 7);

        // Fetch Current Period Sales
        const currentSales = await prisma.sale.findMany({
            where: { store_id: storeId, business_date: { gte: currentStart, lte: currentEnd } },
            include: { menu_items: true }
        });

        // Fetch Wow Sales
        const wowSales = await prisma.sale.findMany({
            where: { store_id: storeId, business_date: { gte: wowStart, lte: wowEnd } },
            include: { menu_items: true }
        });

        // Fetch Mom Sales
        const momSales = await prisma.sale.findMany({
            where: { store_id: storeId, business_date: { gte: momStart, lte: momEnd } }
        });

        // Fetch SDLW Sales
        const sdlwSales = await prisma.sale.findMany({
            where: { store_id: storeId, business_date: { gte: sdlwStart, lte: sdlwEnd } }
        });

        // -------------------------
        // Calculate Base Metrics
        // -------------------------
        const calcTotalRevenue = (sales: any[]) => sales.reduce((acc, max) => acc + max.paid_amount, 0);
        
        const currentRevenue = calcTotalRevenue(currentSales);
        const wowRevenue = calcTotalRevenue(wowSales);
        const momRevenue = calcTotalRevenue(momSales);
        const sdlwRevenue = calcTotalRevenue(sdlwSales);

        const currentOrdersCount = currentSales.length;
        const currentAOV = currentOrdersCount > 0 ? Math.round(currentRevenue / currentOrdersCount) : 0;
        
        const wowOrdersCount = wowSales.length;
        const wowAOV = wowOrdersCount > 0 ? Math.round(wowRevenue / wowOrdersCount) : 0;

        // Retention Rate (Count of unique customer_mobile_phone_number that have > 1 orders historically vs total unique phone numbers in this period)
        // For accurate retention, we should see if the phone numbers in this period have ordered BEFORE this period.
        const currentPhones = [...new Set(currentSales.map(s => s.customer_mobile_phone_number).filter(Boolean))];
        let retentionCount = 0;
        if (currentPhones.length > 0) {
            const previousVisits = await prisma.sale.groupBy({
                by: ['customer_mobile_phone_number'],
                where: {
                    store_id: storeId,
                    customer_mobile_phone_number: { in: currentPhones as string[] },
                    business_date: { lt: currentStart } // ordered before this period
                }
            });
            retentionCount = previousVisits.length;
        }
        const currentRetentionRate = currentPhones.length > 0 ? (retentionCount / currentPhones.length) * 100 : 0;

        // -------------------------
        // 5-Step Funnel Construction
        // -------------------------
        const footTraffics = await prisma.footTraffic.findMany({
            where: { store_id: storeId, visit_date: { gte: currentStart, lte: currentEnd } }
        });

        const totalPassBy = footTraffics.filter(t => t.widget_name === "유동인구").reduce((acc, curr) => acc + curr.visit_count, 0);
        const totalVisit = footTraffics.filter(t => t.widget_name === "매장 방문").reduce((acc, curr) => acc + curr.visit_count, 0);

        const funnel = {
            traffic: totalPassBy,
            visit: totalVisit > 0 ? totalVisit : totalPassBy > 0 ? Math.round(totalPassBy * 0.1) : 0, // Fallback dummy if no May-I data
            order: currentOrdersCount,
            aov: currentAOV,
            retention: parseFloat(currentRetentionRate.toFixed(1))
        };

        // -------------------------
        // Generate Aggregations for Current Period
        // -------------------------
        const revenueTrendMap: Record<string, { date: string; revenue: number; orders: number }> = {};
        const heatmap: Record<number, Record<number, number>> = {};
        for (let d = 0; d < 7; d++) {
            heatmap[d] = {};
            for (let h = 0; h < 24; h++) heatmap[d][h] = 0;
        }

        let totalPaid = 0;
        let totalPoint = 0;
        let totalPrepaid = 0;
        const channelsMap: Record<string, number> = {};
        const menuABCMap: Record<string, { name: string; quantity: number; revenue: number; previousQuantity?: number; previousRevenue?: number }> = {};

        // Populate WoW Menu data for comparative baseline
        wowSales.forEach(sale => {
            sale.menu_items.forEach(menu => {
                if (menu.product_price === 0 && menu.total_price === 0) return;
                const targetName = menu.product_name || '알수없음';
                if (!menuABCMap[targetName]) {
                    menuABCMap[targetName] = { name: targetName, quantity: 0, revenue: 0, previousQuantity: 0, previousRevenue: 0 };
                }
                menuABCMap[targetName].previousQuantity! += menu.quantity;
                menuABCMap[targetName].previousRevenue! += menu.total_price;
            });
        });

        currentSales.forEach(sale => {
            // Revenue Trend
            const dateStr = sale.business_date.toISOString().split('T')[0];
            if (!revenueTrendMap[dateStr]) revenueTrendMap[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
            revenueTrendMap[dateStr].revenue += sale.paid_amount;
            revenueTrendMap[dateStr].orders += 1;

            // Heatmap
            const dateObj = new Date(sale.created_at);
            const dayOfWeek = dateObj.getUTCDay();
            const hourOfDay = dateObj.getUTCHours();
            heatmap[dayOfWeek][hourOfDay] += sale.paid_amount;

            // Payment Methods
            totalPaid += sale.paid_amount;
            totalPoint += sale.point_used_amount;
            totalPrepaid += sale.prepaid_used_amount;

            // Channels
            const channel = sale.delivery_app || sale.order_from || '방문/포장';
            channelsMap[channel] = (channelsMap[channel] || 0) + sale.paid_amount;

            // Menu Items
            sale.menu_items.forEach(menu => {
                if (menu.product_price === 0 && menu.total_price === 0) return;
                const targetName = menu.product_name || '알수없음';
                if (!menuABCMap[targetName]) {
                    menuABCMap[targetName] = { name: targetName, quantity: 0, revenue: 0, previousQuantity: 0, previousRevenue: 0 };
                }
                menuABCMap[targetName].quantity += menu.quantity;
                menuABCMap[targetName].revenue += menu.total_price;
            });
        });

        const dayHourHeatmap: any[] = [];
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        for (let d = 0; d < 7; d++) {
            for (let h = 0; h < 24; h++) {
                if (heatmap[d][h] > 0) {
                    dayHourHeatmap.push({ dayIndex: d, dayName: days[d], hour: h, revenue: heatmap[d][h] });
                }
            }
        }

        const channels = Object.keys(channelsMap).map(k => ({ name: k, value: channelsMap[k] })).sort((a, b) => b.value - a.value);

        const paymentMethods = [
            { name: '신용카드/현금상당액', value: totalPaid },
            { name: '포인트 결제', value: totalPoint },
            { name: '선불권 결제', value: totalPrepaid }
        ].filter(p => p.value > 0);

        // Calculate ABC Analysis
        const menuArray = Object.values(menuABCMap)
            .filter(m => m.revenue > 0)
            .sort((a, b) => b.revenue - a.revenue);

        let cumulativeRevenue = 0;
        const totalMenuRevenue = menuArray.reduce((acc, curr) => acc + curr.revenue, 0);

        const abcAnalysis = menuArray.map(menu => {
            cumulativeRevenue += menu.revenue;
            const cumulativePercent = (cumulativeRevenue / (totalMenuRevenue || 1)) * 100;

            let grade = 'C';
            if (cumulativePercent <= 70) grade = 'A';
            else if (cumulativePercent <= 90) grade = 'B';

            // Calculate percentage difference vs last week
            const revenueDelta = menu.previousRevenue ? ((menu.revenue - menu.previousRevenue) / menu.previousRevenue) * 100 : null;

            return {
                ...menu,
                cumulativePercent,
                grade,
                revenueDelta: revenueDelta !== null ? parseFloat(revenueDelta.toFixed(1)) : null
            };
        });

        // Deltas computation
        const calcDelta = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return parseFloat((((current - previous) / previous) * 100).toFixed(1));
        };

        const deltas = {
            wowRevenue: calcDelta(currentRevenue, wowRevenue),
            momRevenue: calcDelta(currentRevenue, momRevenue),
            sdlwRevenue: calcDelta(currentRevenue, sdlwRevenue),
            wowOrders: calcDelta(currentOrdersCount, wowOrdersCount),
            wowAOV: calcDelta(currentAOV, wowAOV)
        };

        return NextResponse.json({
            status: "success",
            data: {
                totalRevenue: currentRevenue,
                totalOrders: currentOrdersCount,
                deltas,
                funnel,
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
