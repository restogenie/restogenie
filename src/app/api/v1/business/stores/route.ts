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
