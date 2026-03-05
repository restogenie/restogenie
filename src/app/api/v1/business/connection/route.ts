import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const user = await getUserFromSession();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { store_id, vendor, auth_code_1, auth_code_2, auth_code_3 } = body;

        if (!store_id || !vendor) {
            return NextResponse.json({ detail: "Missing store_id or vendor" }, { status: 400 });
        }

        // Validate the store belongs to the user or is a member
        const store = await db.store.findFirst({
            where: { id: store_id, user_id: user.id }
        });

        const storeMember = await db.storeMember.findFirst({
            where: { store_id: store_id, user_id: user.id }
        });

        if (!store && !storeMember) {
            return NextResponse.json({ detail: "Store not found or access denied" }, { status: 403 });
        }

        // Upsert PosConnection for this store and vendor
        // We assume 1 vendor active at a time for simplicity, but DB supports multiple.
        // We'll update an existing connection for this vendor, or create one.

        const existingConnection = await db.posConnection.findFirst({
            where: { store_id: store_id, vendor: vendor }
        });

        let connection;
        if (existingConnection) {
            connection = await db.posConnection.update({
                where: { id: existingConnection.id },
                data: {
                    auth_code_1: auth_code_1 || existingConnection.auth_code_1,
                    auth_code_2: auth_code_2 || existingConnection.auth_code_2,
                    auth_code_3: auth_code_3 || existingConnection.auth_code_3,
                    is_active: true,
                    sync_status: ["baemin", "coupangeats", "yogiyo"].includes(vendor) ? "PENDING" : "FINISHED"
                }
            });
        } else {
            connection = await db.posConnection.create({
                data: {
                    store_id: store_id,
                    vendor: vendor,
                    auth_code_1: auth_code_1 || null,
                    auth_code_2: auth_code_2 || null,
                    auth_code_3: auth_code_3 || null,
                    is_active: true,
                    sync_status: ["baemin", "coupangeats", "yogiyo"].includes(vendor) ? "PENDING" : "FINISHED"
                }
            });
        }

        return NextResponse.json({ status: "success", pos_connection_id: connection.id });

    } catch (error: any) {
        console.error("Error saving POS connection:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}
