import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import * as bcrypt from "bcryptjs";

export async function GET(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    try {
        const profile = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                created_at: true
            }
        });

        if (!profile) {
            return NextResponse.json({ detail: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ status: "success", user: profile });
    } catch (error: any) {
        console.error("Profile Fetch Error:", error);
        return NextResponse.json({ status: "error", message: "Failed to fetch profile" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, phone, password } = body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;

        if (password && password.length >= 8) {
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
            }
        });

        return NextResponse.json({ status: "success", user: updatedUser });
    } catch (error: any) {
        console.error("Profile Update Error:", error);
        return NextResponse.json({ status: "error", message: "Failed to update profile" }, { status: 500 });
    }
}
