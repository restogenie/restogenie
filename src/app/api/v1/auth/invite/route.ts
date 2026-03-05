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
        const inviterId = payload.sub ? parseInt(payload.sub as string, 10) : null;

        if (!inviterId) {
            return NextResponse.json({ detail: "Invalid token payload" }, { status: 401 });
        }

        const body = await request.json();
        const { store_id, target_email, role } = body;

        if (!store_id || !target_email || !role) {
            return NextResponse.json({ message: "Store ID, Target Email, and Role are required." }, { status: 400 });
        }

        const storeIdNum = parseInt(store_id, 10);

        // Check permission: Inviter must be the store OWNER
        const store = await prisma.store.findFirst({
            where: { id: storeIdNum, user_id: inviterId }
        });

        if (!store) {
            return NextResponse.json({ message: "Only the store owner can invite new members." }, { status: 403 });
        }

        // Find Target User
        const targetUser = await prisma.user.findUnique({
            where: { email: target_email }
        });

        if (!targetUser) {
            return NextResponse.json({ message: "We couldn't find an account matching that email address." }, { status: 404 });
        }

        // Check if already a member
        const existingMember = await prisma.storeMember.findFirst({
            where: { store_id: storeIdNum, user_id: targetUser.id }
        });

        if (existingMember) {
            return NextResponse.json({ message: "This user is already a member of the store." }, { status: 409 });
        }

        // Create Member
        await prisma.storeMember.create({
            data: {
                store_id: storeIdNum,
                user_id: targetUser.id,
                role: role // STAFF, MANAGER
            }
        });

        return NextResponse.json({
            status: "success",
            message: `Successfully invited ${target_email} as ${role}.`
        });

    } catch (error: any) {
        console.error("Invite API Error:", error);
        return NextResponse.json(
            { status: "error", message: error.message || "Failed to process invitation." },
            { status: 500 }
        );
    }
}
