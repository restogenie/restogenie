import { NextResponse } from "next/server";
import { EasyposSyncService } from "@/lib/services/easypos";
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
                where: { store_id: storeId, vendor: "easypos", is_active: true }
            });
            if (!connection || !connection.auth_code_1 || !connection.auth_code_2) {
                return NextResponse.json({ detail: "Active Easypos connection with HD/SP codes not found for this store" }, { status: 404 });
            }
            storesToSync.push({ storeId, hdCode: connection.auth_code_1, spCode: connection.auth_code_2 });
        } else {
            // Global cron sync
            const connections = await prisma.posConnection.findMany({
                where: { vendor: "easypos", is_active: true }
            });
            storesToSync = connections.filter(c => c.auth_code_1 && c.auth_code_2).map(c => ({
                storeId: c.store_id,
                hdCode: c.auth_code_1 as string,
                spCode: c.auth_code_2 as string
            }));
        }

        const results = [];
        for (const { storeId, hdCode, spCode } of storesToSync) {
            const service = new EasyposSyncService(storeId, hdCode, spCode);
            try {
                const res = await service.runSync(targetDate);
                results.push({ store_id: storeId, status: "success", data: res });
            } catch (err: any) {
                results.push({ store_id: storeId, status: "error", error: err.message });
            }
        }

        return NextResponse.json({
            status: "success",
            message: `Easypos sync processing completed for ${format(targetDate, 'yyyy-MM-dd')}`,
            data: results
        });
    } catch (error: any) {
        console.error("Easypos Sync API Error:", error);
        return NextResponse.json(
            { status: "error", message: error.message || "Failed to sync Easypos." },
            { status: 500 }
        );
    }
}
