import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export async function GET(request: Request) {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const store_id = parseInt(searchParams.get("store_id") || "0", 10);
    if (!store_id) return NextResponse.json({ detail: "store_id required" }, { status: 400 });

    try {
        const connections = await prisma.cctvConnection.findMany({
            where: { store_id }
        });
        return NextResponse.json({ connections });
    } catch (e: any) {
        return NextResponse.json({ detail: "Error fetching" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { store_id } = body;
        
        if (!store_id) return NextResponse.json({ detail: "store_id required" }, { status: 400 });

        const result = await prisma.cctvConnection.upsert({
            where: { store_id },
            update: { is_active: true, sync_status: "PENDING" },
            create: { store_id, is_active: true, sync_status: "PENDING" }
        });

        return NextResponse.json({ success: true, connection: result });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ detail: "Server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const store_id = parseInt(searchParams.get("store_id") || "0", 10);

    try {
        await prisma.cctvConnection.delete({
            where: { store_id }
        });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ detail: "Delete error" }, { status: 500 });
    }
}
