import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { MayiSyncService } from "@/lib/services/mayi";
import { DateTime } from "luxon";
import { prisma as db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export async function POST(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { store_id, start_date, end_date } = body;

        if (!store_id) {
            return NextResponse.json({ detail: "Store ID is required for CCTV Sync" }, { status: 400 });
        }

        const connection = await db.posConnection.findFirst({
            where: {
                store_id: parseInt(store_id),
                vendor: 'mayi'
            }
        });

        if (!connection || !connection.auth_code_1 || !connection.auth_code_2 || !connection.auth_code_3 || !connection.auth_code_4) {
            return NextResponse.json({ detail: "메이아이(CCTV) 계정 정보 및 매장 ID가 설정되어 있지 않습니다." }, { status: 400 });
        }

        const email = decrypt(connection.auth_code_1);
        const password = decrypt(connection.auth_code_2);
        const dashboardId = connection.auth_code_3; // ID is unencrypted
        const mayiStoreId = connection.auth_code_4; // Store UUID is unencrypted

        let syncStart = DateTime.now().setZone('Asia/Seoul').minus({ days: 1 }).startOf('day').toJSDate();
        let syncEnd = DateTime.now().setZone('Asia/Seoul').minus({ days: 1 }).endOf('day').toJSDate();

        if (start_date) {
            syncStart = DateTime.fromISO(start_date, { zone: 'Asia/Seoul' }).startOf('day').toJSDate();
        }
        if (end_date) {
            syncEnd = DateTime.fromISO(end_date, { zone: 'Asia/Seoul' }).endOf('day').toJSDate();
        }

        await MayiSyncService.runSync(email, password, dashboardId, mayiStoreId, parseInt(store_id), syncStart, syncEnd);

        return NextResponse.json({ success: true, message: "메이아이 유동인구 데이터 동기화 완료" });
    } catch (error: any) {
        console.error("May-I Sync POST Error:", error);
        return NextResponse.json({ detail: error.message || "동기화 실패" }, { status: 500 });
    }
}
