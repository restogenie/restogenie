import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma as db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const formData = await request.formData().catch(() => new FormData());
        const email = formData.get("username")?.toString();
        const password = formData.get("password")?.toString();

        if (!email || !password) {
            return NextResponse.json(
                { detail: "이메일과 비밀번호를 모두 입력해주세요." },
                { status: 400 }
            );
        }

        // 1. Check User in DB
        const user = await db.user.findUnique({
            where: { email },
            include: { stores: true }
        });

        if (!user) {
            return NextResponse.json(
                { detail: "등록되지 않은 이메일입니다." },
                { status: 401 }
            );
        }

        // 2. Validate Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return NextResponse.json(
                { detail: "비밀번호가 일치하지 않습니다." },
                { status: 401 }
            );
        }

        const secretKey = process.env.JWT_SECRET_KEY || "restogenie_secret_key_random_string_here_12345";

        // Generate JWT with user_id payload
        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + 86400; // 24 hours expiry

        const token = await new SignJWT({ sub: user.id.toString(), email: user.email })
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .setExpirationTime(exp)
            .setIssuedAt(iat)
            .sign(new TextEncoder().encode(secretKey));

        // Get default store_id (first store)
        const defaultStoreId = user.stores.length > 0 ? user.stores[0].id : null;

        return NextResponse.json({
            access_token: token,
            token_type: "bearer",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                default_store_id: defaultStoreId
            }
        });
    } catch (error: any) {
        console.error("Auth API Error:", error);
        return NextResponse.json(
            { detail: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
