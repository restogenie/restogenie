import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export async function GET(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Could not validate credentials" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const storeIdParam = searchParams.get("store_id");
        if (!storeIdParam) {
            return NextResponse.json({ detail: "store_id is required" }, { status: 400 });
        }

        const storeId = parseInt(storeIdParam, 10);

        // Authorization check
        const store = await prisma.store.findFirst({
            where: { id: storeId, user_id: user.id }
        });

        if (!store) {
            return NextResponse.json({ detail: "Forbidden access to this store" }, { status: 403 });
        }

        const limitParam = searchParams.get("limit") || "100";
        const limit = parseInt(limitParam, 10);

        const logs = await prisma.systemLog.findMany({
            where: { store_id: storeId },
            orderBy: { created_at: 'desc' },
            take: limit
        });

        return NextResponse.json({
            status: "success",
            data: logs
        });
    } catch (error: any) {
        console.error("Logs API Error:", error);
        return NextResponse.json(
            { status: "error", message: "Failed to fetch logs." },
            { status: 500 }
        );
    }
}
