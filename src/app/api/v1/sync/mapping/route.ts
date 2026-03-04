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
        if (!storeIdParam) return NextResponse.json({ detail: "store_id is required" }, { status: 400 });

        const storeId = parseInt(storeIdParam, 10);
        const store = await prisma.store.findFirst({ where: { id: storeId, user_id: user.id } });
        if (!store) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });

        const limitParam = searchParams.get("limit") || "100";
        const limit = parseInt(limitParam, 10);

        const mappings = await prisma.menuMapping.findMany({
            where: { store_id: storeId },
            orderBy: { created_at: 'desc' },
            take: limit
        });

        return NextResponse.json({
            status: "success",
            data: mappings
        });
    } catch (error: any) {
        console.error("Menu Mapping GET API Error:", error);
        return NextResponse.json(
            { status: "error", message: "Failed to fetch menu mappings." },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Could not validate credentials" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { store_id, provider, original_name, normalized_name } = body;

        if (!store_id || !provider || !original_name || !normalized_name) {
            return NextResponse.json({ detail: "Missing required fields" }, { status: 400 });
        }

        const storeId = parseInt(store_id, 10);
        const store = await prisma.store.findFirst({ where: { id: storeId, user_id: user.id } });
        if (!store) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });

        let mapping = await prisma.menuMapping.findFirst({
            where: { store_id: storeId, provider, original_name }
        });

        if (mapping) {
            mapping = await prisma.menuMapping.update({
                where: { id: mapping.id },
                data: { normalized_name }
            });
        } else {
            mapping = await prisma.menuMapping.create({
                data: { store_id: storeId, provider, original_name, normalized_name }
            });
        }

        return NextResponse.json({ status: "success", data: mapping });
    } catch (error: any) {
        console.error("Menu Mapping POST API Error:", error);
        return NextResponse.json(
            { status: "error", message: "Failed to create menu mapping." },
            { status: 500 }
        );
    }
}
