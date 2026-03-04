import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminServerSide } from "../../sales/route";

export async function GET(request: Request) {
    const admin = await getAdminServerSide(request);
    if (!admin) {
        return NextResponse.json({ detail: "Could not validate credentials" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get("limit") || "100";
        const limit = parseInt(limitParam, 10);

        const mappings = await prisma.menuMapping.findMany({
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
    const admin = await getAdminServerSide(request);
    if (!admin) {
        return NextResponse.json({ detail: "Could not validate credentials" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { provider, original_name, normalized_name } = body;

        if (!provider || !original_name || !normalized_name) {
            return NextResponse.json({ detail: "Missing required fields" }, { status: 400 });
        }

        // Upsert logic based on original_name and provider
        let mapping = await prisma.menuMapping.findFirst({
            where: { provider, original_name }
        });

        if (mapping) {
            mapping = await prisma.menuMapping.update({
                where: { id: mapping.id },
                data: { normalized_name }
            });
        } else {
            mapping = await prisma.menuMapping.create({
                data: { provider, original_name, normalized_name }
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
