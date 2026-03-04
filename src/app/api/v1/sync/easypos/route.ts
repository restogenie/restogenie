import { NextResponse } from "next/server";
import { EasyposSyncService } from "@/lib/services/easypos";
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

        const service = new EasyposSyncService();
        const result = await service.runSync(targetDate);

        return NextResponse.json({
            status: "success",
            message: `Easypos sync completed for ${format(targetDate, 'yyyy-MM-dd')}`,
            data: result
        });
    } catch (error: any) {
        console.error("Easypos Sync API Error:", error);
        return NextResponse.json(
            { status: "error", message: error.message || "Failed to sync Easypos." },
            { status: 500 }
        );
    }
}
