import { NextResponse } from "next/server";
import { SmartroSyncService } from "@/lib/services/smartro";
import { format } from "date-fns";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        let targetDate = new Date();

        if (body.target_date) {
            targetDate = new Date(body.target_date);
            if (isNaN(targetDate.getTime())) {
                targetDate = new Date(); // Fallback
            }
        }

        let storesToSync = [];

        if (body.store_id) {
            // Manual sync request for a specific store
            const storeId = parseInt(body.store_id, 10);
            const connection = await prisma.posConnection.findFirst({
                where: { store_id: storeId, vendor: "smartro", is_active: true }
            });
            if (!connection || !connection.auth_code_1 || !connection.auth_code_2 || !connection.auth_code_3) {
                return NextResponse.json({ detail: "Active Smartro connection not found for this store" }, { status: 404 });
            }
            storesToSync.push({
                storeId,
                authKey: connection.auth_code_1,
                compNo: connection.auth_code_2,
                storeCode: connection.auth_code_3
            });
        } else {
            // Global cron sync
            const connections = await prisma.posConnection.findMany({
                where: { vendor: "smartro", is_active: true }
            });
            storesToSync = connections.filter(c => c.auth_code_1 && c.auth_code_2 && c.auth_code_3).map(c => ({
                storeId: c.store_id,
                authKey: c.auth_code_1 as string,
                compNo: c.auth_code_2 as string,
                storeCode: c.auth_code_3 as string
            }));
        }

        const results = [];
        for (const { storeId, authKey, compNo, storeCode } of storesToSync) {
            const service = new SmartroSyncService(storeId, authKey, compNo, storeCode);
            try {
                const res = await service.runSync(targetDate);
                results.push({ store_id: storeId, status: "success", data: res });
            } catch (err: any) {
                results.push({ store_id: storeId, status: "error", error: err.message });
            }
        }

        return NextResponse.json({
            status: "success",
            message: `Smartro sync processing completed for ${format(targetDate, 'yyyy-MM-dd')}`,
            data: results
        });
    } catch (error: any) {
        console.error("Smartro Sync API Error:", error);
        return NextResponse.json(
            { status: "error", message: error.message || "Failed to sync Smartro." },
            { status: 500 }
        );
    }
}
