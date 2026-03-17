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
            totalVisitsForHeatmap
        });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ detail: "Server Error" }, { status: 500 });
    }
}
