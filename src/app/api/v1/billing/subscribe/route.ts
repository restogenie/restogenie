import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY || "super-secret-default-key");

export async function POST(request: Request) {
    try {
        const headersList = await headers();
        const authHeader = headersList.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ detail: "Missing or invalid token" }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.sub ? parseInt(payload.sub as string, 10) : null;

        if (!userId) {
            return NextResponse.json({ detail: "Invalid token payload" }, { status: 401 });
        }

        const body = await request.json();
        const { store_id, billing_key, customer_key } = body;

        if (!store_id || !billing_key) {
            return NextResponse.json({ message: "Store ID and Billing Key are required." }, { status: 400 });
        }

        // Verify Store Ownership
        const store = await prisma.store.findFirst({
            where: { id: parseInt(store_id, 10), user_id: userId }
        });

        if (!store) {
            return NextResponse.json({ message: "Store not found or access denied." }, { status: 403 });
        }

        // Apply Subscription to Store
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await prisma.store.update({
            where: { id: store.id },
            data: {
                subscription_status: "ACTIVE",
                subscription_end_date: nextMonth,
                billing_key: billing_key
            }
        });

        return NextResponse.json({
            status: "success",
            message: "Subscription activated successfully. Valid for 30 days."
        });

    } catch (error: any) {
        console.error("Billing API Error:", error);
        return NextResponse.json(
            { status: "error", message: error.message || "Failed to process billing." },
            { status: 500 }
        );
    }
}
