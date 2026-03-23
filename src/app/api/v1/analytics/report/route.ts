import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { decrypt } from '@/lib/encryption';

export async function GET(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const storeIdParam = searchParams.get("store_id");
        if (!storeIdParam) {
            return NextResponse.json({ detail: "store_id is required" }, { status: 400 });
        }

        const storeId = parseInt(storeIdParam, 10);
        const store = await prisma.store.findFirst({
            where: { id: storeId, user_id: user.id }
        });

        if (!store) {
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

        const diffTime = Math.abs(currentEnd.getTime() - currentStart.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Determine period length (N days)

        // Previous Period (N days before currentStart)
        const prevStart = new Date(currentStart);
        prevStart.setDate(prevStart.getDate() - diffDays);
        const prevEnd = new Date(currentStart);
        prevEnd.setUTCHours(0, 0, 0, -1); // 1 ms before currentStart

        // 4-Period Average (4 * N days before currentStart)
        const avg4Start = new Date(currentStart);
        avg4Start.setDate(avg4Start.getDate() - (diffDays * 4));
        const avg4End = new Date(currentStart);
        avg4End.setUTCHours(0, 0, 0, -1);

        // Fetch Sales Data
        const currentSales = await prisma.sale.findMany({
            where: { store_id: storeId, business_date: { gte: currentStart, lte: currentEnd } },
            include: { menu_items: true }
        });

        const prevSales = await prisma.sale.findMany({
            where: { store_id: storeId, business_date: { gte: prevStart, lte: prevEnd } }
        });

        const avg4Sales = await prisma.sale.findMany({
            where: { store_id: storeId, business_date: { gte: avg4Start, lte: avg4End } }
        });

        // Fetch Foot Traffic Data
        const currentTraffic = await prisma.footTraffic.findMany({
            where: { store_id: storeId, visit_date: { gte: currentStart, lte: currentEnd } }
        });

        const prevTraffic = await prisma.footTraffic.findMany({
            where: { store_id: storeId, visit_date: { gte: prevStart, lte: prevEnd } }
        });

        const avg4Traffic = await prisma.footTraffic.findMany({
            where: { store_id: storeId, visit_date: { gte: avg4Start, lte: avg4End } }
        });

        // Helpers
        const calcRevenue = (sales: any[]) => sales.reduce((acc, s) => acc + s.paid_amount, 0);
        const calcDiscount = (sales: any[]) => sales.reduce((acc, s) => acc + s.discount_amount, 0);
        
        const getHallSales = (sales: any[]) => sales.filter(s => !s.delivery_app);
        const getDeliverySales = (sales: any[]) => sales.filter(s => s.delivery_app);

        const calcAOV = (sales: any[]) => sales.length > 0 ? Math.round(calcRevenue(sales) / sales.length) : 0;
        
        const calcRetRate = async (sales: any[], periodStart: Date) => {
            const phones = [...new Set(sales.map(s => s.customer_mobile_phone_number).filter(Boolean))] as string[];
            if (phones.length === 0) return 0;
            
            const pastOrders = await prisma.sale.groupBy({
                by: ['customer_mobile_phone_number'],
                where: {
                    store_id: storeId,
                    customer_mobile_phone_number: { in: phones },
                    business_date: { lt: periodStart }
                }
            });
            return (pastOrders.length / phones.length) * 100;
        };

        const getTrafficCount = (traffics: any[], type: string) => traffics.filter(t => t.widget_name === type).reduce((acc, t) => acc + t.visit_count, 0);
        
        const calcVisitRate = (traffics: any[]) => {
            const passBy = getTrafficCount(traffics, "유동인구");
            const visit = getTrafficCount(traffics, "매장 방문");
            return passBy > 0 ? ((visit / passBy) * 100) : 0;
        };

        const calcOrderRate = (traffics: any[], sales: any[]) => {
            const visit = getTrafficCount(traffics, "매장 방문");
            return visit > 0 ? ((sales.length / visit) * 100) : 0;
        };

        // Current Metrics
        const curRev = calcRevenue(currentSales);
        const curDiscount = calcDiscount(currentSales);
        const curHallRev = calcRevenue(getHallSales(currentSales));
        const curHallRatio = curRev > 0 ? ((curHallRev / curRev) * 100) : 0;
        const curHallAOV = calcAOV(getHallSales(currentSales));
        const curDelAOV = calcAOV(getDeliverySales(currentSales));
        const curRetRate = await calcRetRate(currentSales, currentStart);
        const curVisitRate = calcVisitRate(currentTraffic);
        const curOrderRate = calcOrderRate(currentTraffic, currentSales);

        // Prev Metrics
        const pRev = calcRevenue(prevSales);
        const pDiscount = calcDiscount(prevSales);
        const pHallRev = calcRevenue(getHallSales(prevSales));
        const pHallRatio = pRev > 0 ? ((pHallRev / pRev) * 100) : 0;
        const pHallAOV = calcAOV(getHallSales(prevSales));
        const pDelAOV = calcAOV(getDeliverySales(prevSales));
        const pRetRate = await calcRetRate(prevSales, prevStart);
        const pVisitRate = calcVisitRate(prevTraffic);
        const pOrderRate = calcOrderRate(prevTraffic, prevSales);

        // Avg4 Metrics (divide sums by 4)
        const aRev = calcRevenue(avg4Sales) / 4;
        const aDiscount = calcDiscount(avg4Sales) / 4;
        const aHallRev = calcRevenue(getHallSales(avg4Sales)) / 4;
        const aHallRatio = aRev > 0 ? ((aHallRev / aRev) * 100) : 0;
        
        // AOV is averaged per order, so we calculate total revenue of 4 periods / total orders of 4 periods
        const aHallAOV = calcAOV(getHallSales(avg4Sales));
        const aDelAOV = calcAOV(getDeliverySales(avg4Sales));
        const aRetRate = await calcRetRate(avg4Sales, avg4Start);
        const aVisitRate = calcVisitRate(avg4Traffic);
        const aOrderRate = calcOrderRate(avg4Traffic, avg4Sales);

        const createMetricRow = (metric: string, asIs: number, prev: number, avg: number, isPercent: boolean = false) => {
            const format = (v: number) => isPercent ? v.toFixed(1) + '%' : new Intl.NumberFormat('ko-KR').format(Math.round(v));
            const growth = prev > 0 ? ((asIs - prev) / prev) * 100 : 0;
            const gap = avg > 0 ? ((asIs - avg) / avg) * 100 : 0;
            return {
                store: '전사',
                metric,
                asIs: format(asIs),
                prev: format(prev),
                avg: format(avg),
                growth: growth.toFixed(1),
                gap: gap.toFixed(1)
            };
        };

        const keyMetricsData = [
            createMetricRow('총 주문금액 (원)', curRev, pRev, aRev),
            createMetricRow('할인금액 (원)', curDiscount, pDiscount, aDiscount),
            createMetricRow('홀 매출 비중', curHallRatio, pHallRatio, aHallRatio, true),
            createMetricRow('홀 객단가 (원)', curHallAOV, pHallAOV, aHallAOV),
            createMetricRow('배달 객단가 (원)', curDelAOV, pDelAOV, aDelAOV),
            createMetricRow('재방문율', curRetRate, pRetRate, aRetRate, true),
            createMetricRow('방문 전환율', curVisitRate, pVisitRate, aVisitRate, true),
            createMetricRow('주문 전환율', curOrderRate, pOrderRate, aOrderRate, true)
        ];

        // -------------------------
        // Menu Analysis (Daily Sales)
        // -------------------------
        const dailySalesData: any[] = [];
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        
        for (let i = 0; i < diffDays; i++) {
            const targetDate = new Date(currentStart);
            targetDate.setDate(targetDate.getDate() + i);
            const dString = targetDate.toISOString().split('T')[0];
            const dSales = currentSales.filter(s => s.business_date.toISOString().split('T')[0] === dString);
            
            dailySalesData.push({
                date: `${dString} (${days[targetDate.getDay()]})`,
                sales: calcRevenue(dSales),
                customers: dSales.length,
                hallSales: calcRevenue(getHallSales(dSales)),
                deliverySales: calcRevenue(getDeliverySales(dSales))
            });
        }

        // -------------------------
        // Category Sales (Menu Data)
        // -------------------------
        const categoryMap: Record<string, { quantity: number, revenue: number }> = {};
        let totalMenuRev = 0;
        
        currentSales.forEach(sale => {
            sale.menu_items.forEach(menu => {
                if (menu.product_price === 0 && menu.total_price === 0) return; // skip options if they are 0
                const cat = menu.product_name || '미분류';
                if (!categoryMap[cat]) categoryMap[cat] = { quantity: 0, revenue: 0 };
                categoryMap[cat].quantity += menu.quantity;
                categoryMap[cat].revenue += menu.total_price;
                totalMenuRev += menu.total_price;
            });
        });

        const menuOverallData = Object.entries(categoryMap).map(([cat, stats]) => ({
            category: cat,
            ratio: totalMenuRev > 0 ? ((stats.revenue / totalMenuRev) * 100).toFixed(1) : '0.0',
            sales: new Intl.NumberFormat('ko-KR').format(stats.revenue),
            quantity: stats.quantity.toString()
        })).sort((a, b) => parseFloat(b.ratio) - parseFloat(a.ratio));

        // -------------------------
        // Generate Real AI Insight (Replacing mock text)
        // -------------------------
        const apiKeyRecord = await prisma.aiApiKey.findFirst({
            where: { user_id: user.id, is_active: true },
            orderBy: { created_at: 'desc' }
        });

        let aiInsight = "전반적으로 안정적인 보합세를 유지하고 있습니다. 배달 채널이나 신규 방문객 유입을 테스트해볼 시점입니다."; // default fallback

        try {
            let attemptKey = "";
            let attemptEngine = "GEMINI";

            if (apiKeyRecord) {
                try { attemptKey = decrypt(apiKeyRecord.encrypted_key); attemptEngine = apiKeyRecord.engine; } catch (e) {}
            }
            if (!attemptKey) { attemptKey = process.env.FALLBACK_GEMINI_API_KEY || ""; attemptEngine = "GEMINI"; }

            if (attemptKey) {
                let aiModel: any;
                if (attemptEngine === "OPENAI") aiModel = createOpenAI({ apiKey: attemptKey })('gpt-4o');
                else if (attemptEngine === "CLAUDE") aiModel = createAnthropic({ apiKey: attemptKey })('claude-3-5-sonnet-20241022');
                else aiModel = createGoogleGenerativeAI({ apiKey: attemptKey })('gemini-3-flash-preview');

                const summaryContext = `
매장명: ${store.name}
분석기간: ${diffDays}일
총 주문금액: ${curRev}원 (직전 동기간 대비 증감률: ${keyMetricsData[0].growth}%)
재방문율: ${curRetRate.toFixed(1)}%
평균 객단가(홀/배달): ${curHallAOV}원 / ${curDelAOV}원
매장 방문전환율: ${curVisitRate.toFixed(1)}%
주문 전환율: ${curOrderRate.toFixed(1)}%.`;

                const { text } = await generateText({
                    model: aiModel,
                    prompt: summaryContext,
                    system: `당신은 프랜차이즈 경영 컨설턴트입니다. 주어진 요약 데이터를 바탕으로 매장의 성장성, 전환율, 객단가를 종합적으로 평가하는 2~3문장의 짧고 핵심적인 통합 진단 코멘트를 한국어로 작성하세요. 인사말은 생략하세요.`
                });
                if (text) aiInsight = text;
            }
        } catch (err) {
            console.error("AI Insight Generation Failed", err);
        }

        return NextResponse.json({
            status: "success",
            period: {
                start: currentStart.toISOString().split('T')[0],
                end: currentEnd.toISOString().split('T')[0],
                days: diffDays
            },
            keyMetricsData,
            dailySalesData,
            menuOverallData,
            aiInsight
        });

    } catch (e: any) {
        console.error("WeeklyReport API Error:", e);
        return NextResponse.json({ detail: "Server Error" }, { status: 500 });
    }
}
