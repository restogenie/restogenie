import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jwtVerify } from "jose";

// Admin Authentication Helper
export async function getAdminServerSide(request: Request): Promise<string | null> {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    const token = authHeader.substring(7);
    const secretKey = process.env.JWT_SECRET_KEY || "restogenie_secret_key_random_string_here_12345";
    try {
        const secret = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, secret);
        if (payload.sub === "admin") {
            return "admin";
        }
    } catch {
        return null;
    }
    return null;
}

export async function GET(request: Request) {
    // 1. Authenticate Request
    const admin = await getAdminServerSide(request);
    if (!admin) {
        return NextResponse.json({ detail: "Could not validate credentials" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get("start_date");
        const endDateParam = searchParams.get("end_date");
        const limitParam = searchParams.get("limit") || "100";
        const limit = parseInt(limitParam, 10);

        let dateFilter = {};
        if (startDateParam && endDateParam) {
            dateFilter = {
                business_date: {
                    gte: new Date(startDateParam),
                    lte: new Date(endDateParam)
                }
            };
        } else if (startDateParam) {
            dateFilter = { business_date: { gte: new Date(startDateParam) } };
        } else if (endDateParam) {
            dateFilter = { business_date: { lte: new Date(endDateParam) } };
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
