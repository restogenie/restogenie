import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get('store_id');

        if (!storeId) {
            return NextResponse.json({ detail: "Store ID is required" }, { status: 400 });
        }

        // Verify the user owns this store
        const store = await db.store.findFirst({
            where: { id: parseInt(storeId), user_id: user.id }
        });

        if (!store) {
            return NextResponse.json({ detail: "Store not found or unauthorized" }, { status: 403 });
        }

        const connections = await db.posConnection.findMany({
            where: { store_id: parseInt(storeId) },
            orderBy: { created_at: 'desc' }
        });

        return NextResponse.json({ connections });
    } catch (error: any) {
        console.error("Error fetching pos connections:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const storeId = searchParams.get('store_id');

        if (!id || !storeId) {
            return NextResponse.json({ detail: "Connection ID and Store ID are required" }, { status: 400 });
        }

        // Verify the user owns this store
        const store = await db.store.findFirst({
            where: { id: parseInt(storeId), user_id: user.id }
        });

        if (!store) {
            return NextResponse.json({ detail: "Store not found or unauthorized" }, { status: 403 });
        }

        // Check if connection exists and belongs to the store
        const connection = await db.posConnection.findFirst({
            where: { id: parseInt(id), store_id: parseInt(storeId) }
        });

        if (!connection) {
            return NextResponse.json({ detail: "Connection not found" }, { status: 404 });
        }

        await db.posConnection.delete({
            where: { id: parseInt(id) }
        });

        return NextResponse.json({ status: "success", detail: "Connection deleted" });
    } catch (error: any) {
        console.error("Error deleting pos connection:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { store_id, vendor, auth_code_1, auth_code_2, auth_code_3 } = body;

        if (!store_id || !vendor) {
            return NextResponse.json({ detail: "Store ID and Vendor are required" }, { status: 400 });
        }

        // Verify the user owns this store
        const store = await db.store.findFirst({
            where: { id: parseInt(store_id), user_id: user.id }
        });

        if (!store) {
            return NextResponse.json({ detail: "Store not found or unauthorized" }, { status: 403 });
        }

        const upsertedConnection = await db.posConnection.upsert({
            where: {
                store_id_vendor: {
                    store_id: parseInt(store_id),
                    vendor: vendor
                }
            },
            update: {
                auth_code_1: auth_code_1 || null,
                auth_code_2: auth_code_2 || null,
                auth_code_3: auth_code_3 || null,
                is_active: true,
                sync_status: "PENDING"
            },
            create: {
                store_id: parseInt(store_id),
                vendor: vendor,
                auth_code_1: auth_code_1 || null,
                auth_code_2: auth_code_2 || null,
                auth_code_3: auth_code_3 || null,
                is_active: true,
                sync_status: "PENDING"
            }
        });

        return NextResponse.json({ status: "success", connection: upsertedConnection });
    } catch (error: any) {
        console.error("Error saving pos connection:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}

