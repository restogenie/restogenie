import { NextResponse } from "next/server";
import { PayhereSyncService } from "@/lib/services/payhere";
import { format } from "date-fns";

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

        const service = new PayhereSyncService();
        const result = await service.runSync(targetDate);

        return NextResponse.json({
            status: "success",
            message: `Payhere sync completed for ${format(targetDate, 'yyyy-MM-dd')}`,
            data: result
        });
    } catch (error: any) {
        console.error("Payhere Sync API Error:", error);
        return NextResponse.json(
            { status: "error", message: error.message || "Failed to sync Payhere." },
            { status: 500 }
        );
    }
}
