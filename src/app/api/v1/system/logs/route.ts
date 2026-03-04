import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminServerSide } from "../../sales/route"; // Reusing auth helper

export async function GET(request: Request) {
    const admin = await getAdminServerSide(request);
    if (!admin) {
        return NextResponse.json({ detail: "Could not validate credentials" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get("limit") || "100";
        const limit = parseInt(limitParam, 10);

        const logs = await prisma.systemLog.findMany({
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
