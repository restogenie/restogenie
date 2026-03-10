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

        let daysToSync = 1;

        if (body.days_to_sync) {
            daysToSync = parseInt(body.days_to_sync, 10);
            if (isNaN(daysToSync) || daysToSync < 1) daysToSync = 1;
            if (daysToSync > 30) daysToSync = 30; // Hard limit
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
                // Loop over days
                for (let i = 0; i < daysToSync; i++) {
                    const syncDate = new Date(targetDate);
                    syncDate.setDate(syncDate.getDate() - i);
                    const res = await service.runSync(syncDate);
                    results.push({ store_id: storeId, status: "success", data: res, synced_date: format(syncDate, 'yyyy-MM-dd') });

                    if (i < daysToSync - 1) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                }
            } catch (err: any) {
                await sendSystemAlert(`Payhere Sync Failed for Store ${storeId}`, err.message);
                results.push({ store_id: storeId, status: "error", error: err.message });
            }
        }

        return NextResponse.json({
            status: "success",
            message: `Payhere sync processing completed up to ${daysToSync} days for ${format(targetDate, 'yyyy-MM-dd')}`,
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

// Allow Vercel Cron to trigger via GET request
export { POST as GET };
