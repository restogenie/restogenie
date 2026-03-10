import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSystemAlert } from "@/lib/alerts";
import { spawn } from "child_process";
import path from "path";

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
                where: { store_id: storeId, vendor: "coupangeats", is_active: true }
            });
            if (!connection || (!connection.auth_code_1 || !connection.auth_code_2)) {
                return NextResponse.json({ detail: "Active Coupang Eats connection (ID/PW) not found for this store" }, { status: 404 });
            }
            storesToSync.push({ storeId, loginId: connection.auth_code_1, loginPw: connection.auth_code_2 });

            // Set status to SYNCING
            await prisma.posConnection.update({
                where: { id: connection.id },
                data: { sync_status: "SYNCING" }
            });
        }

        if (storesToSync.length > 0) {
            const { storeId, loginId, loginPw } = storesToSync[0];

            const scriptPath = [process.cwd(), "scripts", "coupangeats_crawler.js"].join("/");
            console.log(`[Coupangeats Background Sync Scheduled] Store ID: ${storeId}`);

            const child = spawn('node', [scriptPath, String(storeId), loginId, loginPw, targetDate.toISOString()], {
                detached: true,
                stdio: 'ignore',
                env: { ...process.env, LANG: 'ko_KR.UTF-8', LC_ALL: 'ko_KR.UTF-8' }
            });
            child.unref();

            return NextResponse.json({
                status: "success",
                message: "Coupang Eats sync task has been scheduled in the background.",
                data: [{ store_id: storeId, status: "scheduled" }]
            });
        }

        return NextResponse.json({
            status: "success",
            message: `Coupang Eats global sync triggered.`,
            data: []
        });
    } catch (error: any) {
        console.error("Coupang Eats Sync API Error:", error);
        await sendSystemAlert(`Coupang Eats Global Sync API Error`, error.message);
        return NextResponse.json(
            { status: "error", message: error.message || "Failed to trigger Coupang Eats sync." },
            { status: 500 }
        );
    }
}

// Allow Vercel Cron to trigger via GET request
export { POST as GET };
