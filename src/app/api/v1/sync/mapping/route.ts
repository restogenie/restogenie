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
        const storeMember = await prisma.storeMember.findFirst({ where: { store_id: storeId, user_id: user.id } });

        if (!store && !storeMember) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });

        const limitParam = searchParams.get("limit") || "500";
        const limit = parseInt(limitParam, 10);

        // Fetch registered mappings
        const mapped = await prisma.menuMapping.findMany({
            where: { store_id: storeId },
            orderBy: { created_at: 'desc' },
            take: limit
        });

        // Fetch unmapped distinct items
        const unmappedData = await prisma.$queryRaw<Array<{ product_name: string; provider: string, recent_create: Date }>>`
            SELECT m.product_name, s.provider, MAX(m.created_at) as recent_create
            FROM menu_db m
            JOIN sales_db s ON m.oid = s.oid
            WHERE s.store_id = ${storeId}
            AND m.product_name NOT IN (
                SELECT original_name FROM menu_mapping_db WHERE store_id = ${storeId}
            )
            AND m.product_name IS NOT NULL
            AND m.product_name != ''
            GROUP BY m.product_name, s.provider
            ORDER BY recent_create DESC
            LIMIT ${limit};
        `;

        // Calculate stats
        const totalMapped = mapped.length;
        const totalPending = unmappedData ? unmappedData.length : 0;
        const totalMenus = totalMapped + totalPending;
        const mappingRate = totalMenus > 0 ? Math.round((totalMapped / totalMenus) * 100) : 0;

        // Items pending that came in within the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newThisWeek = unmappedData ? unmappedData.filter(d => d.recent_create && new Date(d.recent_create) > oneWeekAgo).length : 0;

        const stats = {
            total: totalMenus,
            mapped: totalMapped,
            pending: totalPending,
            rate: mappingRate,
            new_this_week: newThisWeek
        };

        return NextResponse.json({
            status: "success",
            data: {
                stats: stats,
                mapped: mapped,
                unmapped: unmappedData || []
            }
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
        const { store_id, provider, original_name, normalized_name, custom_id, is_option } = body;

        if (!store_id || !provider || !original_name || !normalized_name) {
            return NextResponse.json({ detail: "Missing required fields" }, { status: 400 });
        }

        const storeId = parseInt(store_id, 10);
        const store = await prisma.store.findFirst({ where: { id: storeId, user_id: user.id } });
        const storeMember = await prisma.storeMember.findFirst({ where: { store_id: storeId, user_id: user.id } });

        if (!store && !storeMember) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });

        let mapping = await prisma.menuMapping.findFirst({
            where: { store_id: storeId, provider, original_name }
        });

        if (mapping) {
            mapping = await prisma.menuMapping.update({
                where: { id: mapping.id },
                data: {
                    normalized_name,
                    custom_id: custom_id || null,
                    is_option: is_option || false
                }
            });
        } else {
            mapping = await prisma.menuMapping.create({
                data: {
                    store_id: storeId,
                    provider,
                    original_name,
                    normalized_name,
                    custom_id: custom_id || null,
                    is_option: is_option || false
                }
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
