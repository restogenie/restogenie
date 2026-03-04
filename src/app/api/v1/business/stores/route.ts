import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const stores = await db.store.findMany({
            where: { user_id: user.id },
            include: {
                pos_connections: true
            },
            orderBy: {
                created_at: 'asc'
            }
        });

        const mappedStores = stores.map((store: any) => ({
            id: store.id,
            name: store.name,
            business_number: store.business_number,
            // Provide info if active pos connection exists
            active_vendors: store.pos_connections.filter((c: any) => c.is_active).map((c: any) => c.vendor)
        }));

        return NextResponse.json({ stores: mappedStores });

    } catch (error: any) {
        console.error("Error fetching stores:", error);
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
        const { businessName, businessNumber, businessCondition, businessType, openingDate, storePhone } = body;

        if (!businessName || !businessNumber || !businessCondition || !businessType || !openingDate) {
            return NextResponse.json({ detail: "Missing required fields" }, { status: 400 });
        }

        const newStore = await db.store.create({
            data: {
                user_id: user.id,
                name: businessName,
                business_number: businessNumber,
                business_condition: businessCondition,
                business_type: businessType,
                opening_date: openingDate,
                phone: storePhone || null,
            }
        });

        // Initialize empty pos connection row for easypos
        await db.posConnection.create({
            data: {
                store_id: newStore.id,
                vendor: "easypos",
                is_active: false
            }
        });

        return NextResponse.json({ status: "success", store: newStore });
    } catch (error: any) {
        console.error("Error creating store:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}
