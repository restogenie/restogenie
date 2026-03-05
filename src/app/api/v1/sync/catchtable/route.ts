import { NextResponse } from "next/server";
import { CatchtableSyncService } from "@/lib/services/catchtable";
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
                targetDate = new Date();
            }
        }

        let storesToSync = [];

        if (body.store_id) {
            const storeId = parseInt(body.store_id, 10);
            const connection = await prisma.posConnection.findFirst({
                where: { store_id: storeId, vendor: "catchtable", is_active: true }
            });
            if (!connection || !connection.auth_code_1 || !connection.auth_code_2) {
                return NextResponse.json({ detail: "Active Catchtable connection not found" }, { status: 404 });
            }
            storesToSync.push({
                storeId,
                authKey: connection.auth_code_1 as string,
                storeCode: connection.auth_code_2 as string
            });
        } else {
            const connections = await prisma.posConnection.findMany({
                where: { vendor: "catchtable", is_active: true }
            });
            storesToSync = connections.filter(c => c.auth_code_1 && c.auth_code_2).map(c => ({
                storeId: c.store_id,
                authKey: c.auth_code_1 as string,
                storeCode: c.auth_code_2 as string
            }));
        }

        const results = [];
        for (const { storeId, authKey, storeCode } of storesToSync) {
            const service = new CatchtableSyncService(storeId, authKey, storeCode);
            try {
                const res = await service.runSync(targetDate);
                results.push({ store_id: storeId, status: "success", data: res });
            } catch (err: any) {
                await sendSystemAlert(`Catchtable Sync Failed for Store ${storeId}`, err.message);
                results.push({ store_id: storeId, status: "error", error: err.message });
            }
        }

        return NextResponse.json({
            status: "success",
            message: `Catchtable sync processing completed for ${format(targetDate, 'yyyy-MM-dd')}`,
            data: results
        });
    } catch (error: any) {
        console.error("Catchtable Sync API Error:", error);
        await sendSystemAlert(`Catchtable Global Sync API Error`, error.message);
        return NextResponse.json(
            { status: "error", message: error.message || "Failed to sync Catchtable." },
            { status: 500 }
        );
    }
}
