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

        // Authorization check: Is this store_id owned by the user?
        const store = await prisma.store.findFirst({
            where: { id: storeId, user_id: user.id }
        });

        if (!store) {
            return NextResponse.json({ detail: "Forbidden access to this store" }, { status: 403 });
        }

        const startDateParam = searchParams.get("start_date");
        const endDateParam = searchParams.get("end_date");
        const limitParam = searchParams.get("limit") || "100";
        const limit = parseInt(limitParam, 10);

        let dateFilter: any = { store_id: storeId };
        if (startDateParam && endDateParam) {
            dateFilter.business_date = {
                gte: new Date(startDateParam),
                lte: new Date(endDateParam)
            };
        } else if (startDateParam) {
            dateFilter.business_date = { gte: new Date(startDateParam) };
        } else if (endDateParam) {
            dateFilter.business_date = { lte: new Date(endDateParam) };
        }

        const sales = await prisma.sale.findMany({
            where: dateFilter,
            orderBy: { created_at: 'desc' },
            take: limit
        });

        return NextResponse.json({
            status: "success",
            data: sales
        });

    } catch (error: any) {
        console.error("Sales API Error:", error);
        return NextResponse.json(
            { status: "error", message: "Failed to fetch sales." },
            { status: 500 }
        );
    }
}
