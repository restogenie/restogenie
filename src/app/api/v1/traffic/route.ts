import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { DateTime } from "luxon";

export async function GET(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const store_id = parseInt(searchParams.get("store_id") || "0", 10);
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    if (!store_id) {
        return NextResponse.json({ detail: "store_id required" }, { status: 400 });
    }

    try {
        const store = await prisma.store.findFirst({
            where: { id: store_id, user_id: user.id }
        });

        if (!store) {
            return NextResponse.json({ detail: "Forbidden access" }, { status: 403 });
        }

        let startFilter = DateTime.now().setZone('Asia/Seoul').minus({ days: 30 }).startOf('day').toJSDate();
        let endFilter = DateTime.now().setZone('Asia/Seoul').endOf('day').toJSDate();

        if (start_date) {
            startFilter = DateTime.fromISO(start_date, { zone: 'Asia/Seoul' }).startOf('day').toJSDate();
        }
        if (end_date) {
            endFilter = DateTime.fromISO(end_date, { zone: 'Asia/Seoul' }).endOf('day').toJSDate();
        }

        // Fetch Traffics
        const traffics = await prisma.footTraffic.findMany({
            where: {
                store_id,
                visit_date: {
                    gte: startFilter,
                    lte: endFilter
                }
            }
        });

        // Fetch Sales for funnel
        const salesCount = await prisma.sale.count({
            where: {
                store_id,
                business_date: {
                    gte: startFilter,
                    lte: endFilter
                }
            }
        });

        const passByCount = traffics.filter((t: any) => t.widget_name === "유동인구").reduce((acc: number, t: any) => acc + t.visit_count, 0);
        const visitCount = traffics.filter((t: any) => t.widget_name === "매장 방문").reduce((acc: number, t: any) => acc + t.visit_count, 0);

        // Precompute Time distribution
        const timeMatrix: Record<string, number> = {};
        for (let i = 0; i < 24; i++) {
            timeMatrix[i.toString().padStart(2, '0')] = 0;
        }

        traffics.filter((t: any) => t.widget_name === "매장 방문").forEach((t: any) => {
            if (t.visit_time) {
                const hour = t.visit_time.split(':')[0];
                if (timeMatrix[hour] !== undefined) {
                    timeMatrix[hour] += t.visit_count;
                }
            }
        });

        const timeData = Object.keys(timeMatrix).map(hour => ({
            hour: `${hour}:00`,
            visitors: timeMatrix[hour]
        }));

        // Day/Hour Heatmap Matrix
        const heatmapMatrix: Record<number, Record<number, number>> = {};
        for (let d = 0; d < 7; d++) {
            heatmapMatrix[d] = {};
            for (let h = 0; h < 24; h++) heatmapMatrix[d][h] = 0;
        }

        let totalVisitsForHeatmap = 0;

        traffics.filter((t: any) => t.widget_name === "매장 방문").forEach((t: any) => {
            if (t.visit_date && t.visit_time) {
                // Determine day of week from visit_date (0=Sun, 1=Mon, ..., 6=Sat)
                // Assuming visit_date is stored safely and getUTCDay works (or getDay())
                const dayOfWeek = t.visit_date.getUTCDay();
                
                const hourStr = t.visit_time.split(':')[0];
                const hourNum = parseInt(hourStr, 10);

                if (!isNaN(hourNum) && hourNum >= 0 && hourNum < 24) {
                    heatmapMatrix[dayOfWeek][hourNum] += t.visit_count;
                    totalVisitsForHeatmap += t.visit_count;
                }
            }
        });

        const dayHourHeatmap: any[] = [];
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        for (let d = 0; d < 7; d++) {
            for (let h = 0; h < 24; h++) {
                if (heatmapMatrix[d][h] > 0) {
                    dayHourHeatmap.push({
                        dayIndex: d,
                        dayName: days[d],
                        hour: h,
                        visitors: heatmapMatrix[d][h]
                    });
                }
            }
        }

        // Age & Gender Matrix
        const demoMatrix: Record<string, any> = {};
        traffics.filter((t: any) => t.widget_name === "매장 방문" && t.age_group && t.gender).forEach((t: any) => {
            const tempAge = t.age_group || 'Unknown';
            const tempGender = t.gender === 'M' || t.gender === 'Male' || t.gender === '남성' ? 'Male' : 'Female';
            if (!demoMatrix[tempAge]) {
                demoMatrix[tempAge] = { age: tempAge, Male: 0, Female: 0 };
            }
            demoMatrix[tempAge][tempGender] += t.visit_count;
        });

        const demoData = Object.values(demoMatrix).sort((a: any, b: any) => a.age.localeCompare(b.age));

        // --------------------------------------------------------
        // Cross-Analysis: Time x Gender x Age Proportional Matrix
        // --------------------------------------------------------
        // 1. Group Sales by Hour
        const salesByHour: Record<number, number> = {};
        const salesRecords = await prisma.sale.findMany({
            where: {
                store_id,
                business_date: {
                    gte: startFilter,
                    lte: endFilter
                }
            },
            select: {
                created_at: true
            }
        });

        salesRecords.forEach((s: any) => {
            if (s.created_at) {
                const dateObj = new Date(s.created_at);
                const hour = dateObj.getUTCHours(); // assuming UTC handles Korean time correctly if offsets match, or use luxon
                // robust timezone parsing
                const hourStr = DateTime.fromJSDate(dateObj).setZone('Asia/Seoul').toFormat('HH');
                const h = parseInt(hourStr, 10);
                salesByHour[h] = (salesByHour[h] || 0) + 1;
            }
        });

        // 2. Compute Passes and Visits by Hour & Demographic
        const hourDemoStats: Record<number, Record<string, { passBy: number, visit: number }>> = {};
        for (let h = 0; h < 24; h++) hourDemoStats[h] = {};

        traffics.forEach((t: any) => {
            if (t.visit_time && t.age_group && t.gender) {
                const hourNum = parseInt(t.visit_time.split(':')[0], 10);
                const tempAge = t.age_group || 'Unknown';
                const tempGender = t.gender === 'M' || t.gender === 'Male' || t.gender === '남성' ? '남성' : '여성';
                const demoKey = `${tempAge} ${tempGender}`;

                if (!isNaN(hourNum) && hourNum >= 0 && hourNum < 24) {
                    if (!hourDemoStats[hourNum][demoKey]) {
                        hourDemoStats[hourNum][demoKey] = { passBy: 0, visit: 0 };
                    }
                    if (t.widget_name === "유동인구") {
                        hourDemoStats[hourNum][demoKey].passBy += t.visit_count;
                    } else if (t.widget_name === "매장 방문") {
                        hourDemoStats[hourNum][demoKey].visit += t.visit_count;
                    }
                }
            }
        });

        // 3. Proportional Attribution for Sales & Build Final Array
        const crossAnalysisMatrix: any[] = [];
        
        for (let h = 0; h < 24; h++) {
            const totalVisitsHour = Object.values(hourDemoStats[h]).reduce((acc, curr) => acc + curr.visit, 0);
            const totalSalesHour = salesByHour[h] || 0;

            Object.entries(hourDemoStats[h]).forEach(([demoKey, stats]) => {
                // Calculate estimated sales based on visit proportions
                let estSales = 0;
                if (totalVisitsHour > 0) {
                    const ratio = stats.visit / totalVisitsHour;
                    estSales = Math.round(totalSalesHour * ratio);
                }

                if (stats.passBy > 0 || stats.visit > 0 || estSales > 0) {
                    crossAnalysisMatrix.push({
                        hour: h,
                        demographic: demoKey,
                        passBy: stats.passBy,
                        visit: stats.visit,
                        estSales: estSales
                    });
                }
            });
        }

        return NextResponse.json({
            status: "success",
            funnel: {
                passBy: passByCount,
                visit: visitCount,
                sales: salesCount
            },
            timeData,
            demoData,
            dayHourHeatmap,
            totalVisitsForHeatmap,
            crossAnalysisMatrix
        });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ detail: "Server Error" }, { status: 500 });
    }
}
