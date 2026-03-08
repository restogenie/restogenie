import { NextResponse } from "next/server";
import { EasyposSyncService } from "@/lib/services/easypos";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { sendSystemAlert } from "@/lib/alerts";

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

        let daysToSync = 1;

        if (body.days_to_sync) {
            daysToSync = parseInt(body.days_to_sync, 10);
            if (isNaN(daysToSync) || daysToSync < 1) daysToSync = 1;
            if (daysToSync > 30) daysToSync = 30; // Hard limit to avoid timeout
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
                // Loop over days
                for (let i = 0; i < daysToSync; i++) {
                    const syncDate = new Date(targetDate);
                    syncDate.setDate(syncDate.getDate() - i);
                    const res = await service.runSync(syncDate);
                    results.push({ store_id: storeId, status: "success", data: res, synced_date: format(syncDate, 'yyyy-MM-dd') });

                    // Simple delay between days to avoid rate limits
                    if (i < daysToSync - 1) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                }
            } catch (err: any) {
                await sendSystemAlert(`Easypos Sync Failed for Store ${storeId}`, err.message);
                results.push({ store_id: storeId, status: "error", error: err.message });
            }
        }

        return NextResponse.json({
            status: "success",
            message: `Easypos sync processing completed up to ${daysToSync} days for ${format(targetDate, 'yyyy-MM-dd')}`,
            data: results
        });
    } catch (error: any) {
        console.error("Easypos Sync API Error:", error);
        await sendSystemAlert(`Easypos Global Sync API Error`, error.message);
        return NextResponse.json(
            { status: "error", message: error.message || "Failed to sync Easypos." },
            { status: 500 }
        );
    }
}
