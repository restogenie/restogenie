import { NextResponse } from "next/server";
import { PayhereSyncService } from "@/lib/services/payhere";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { sendSystemAlert } from "@/lib/alerts";

export async function POST(request: Request) {
    if (typeof window === "undefined" && false) { return NextResponse.json({}); }
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
                where: { store_id: storeId, vendor: "payhere", is_active: true }
            });
            if (!connection || !connection.auth_code_1) {
                return NextResponse.json({ detail: "Active Payhere connection not found for this store" }, { status: 404 });
            }
            storesToSync.push({ storeId, token: connection.auth_code_1 });
        } else {
            // Global cron sync
            const connections = await prisma.posConnection.findMany({
                where: { vendor: "payhere", is_active: true }
            });
            storesToSync = connections.filter(c => c.auth_code_1).map(c => ({
                storeId: c.store_id,
                token: c.auth_code_1 as string
            }));
        }

        const results = [];
        for (const { storeId, token } of storesToSync) {
            const service = new PayhereSyncService(storeId, token);
            try {
                const res = await service.runSync(targetDate);
                results.push({ store_id: storeId, status: "success", data: res });
            } catch (err: any) {
                await sendSystemAlert(`Payhere Sync Failed for Store ${storeId}`, err.message);
                results.push({ store_id: storeId, status: "error", error: err.message });
            }
        }

        return NextResponse.json({
            status: "success",
            message: `Payhere sync processing completed for ${format(targetDate, 'yyyy-MM-dd')}`,
            data: results
        });
    } catch (error: any) {
        console.error("Payhere Sync API Error:", error);
        await sendSystemAlert(`Payhere Global Sync API Error`, error.message);
        return NextResponse.json(
            { status: "error", message: error.message || "Failed to sync Payhere." },
            { status: 500 }
        );
    }
}
