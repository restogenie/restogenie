import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { MayiSyncService } from "@/lib/services/mayi";
import { DateTime } from "luxon";

export async function POST(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { start_date, end_date } = body;

        let syncStart = DateTime.now().setZone('Asia/Seoul').minus({ days: 1 }).startOf('day').toJSDate();
        let syncEnd = DateTime.now().setZone('Asia/Seoul').minus({ days: 1 }).endOf('day').toJSDate();

        if (start_date) {
            syncStart = DateTime.fromISO(start_date, { zone: 'Asia/Seoul' }).startOf('day').toJSDate();
        }
        if (end_date) {
            syncEnd = DateTime.fromISO(end_date, { zone: 'Asia/Seoul' }).endOf('day').toJSDate();
        }

        await MayiSyncService.runSync(syncStart, syncEnd);

        return NextResponse.json({ success: true, message: "메이아이 유동인구 데이터 동기화 완료" });
    } catch (error: any) {
        console.error("May-I Sync POST Error:", error);
        return NextResponse.json({ detail: error.message || "동기화 실패" }, { status: 500 });
    }
}
