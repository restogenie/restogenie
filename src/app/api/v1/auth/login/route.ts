import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function POST(request: Request) {
    try {
        const formData = await request.formData().catch(() => new FormData());
        const password = formData.get("password")?.toString();

        const adminPassword = process.env.ADMIN_PASSWORD || "supersecretadminpassword2025";
        const secretKey = process.env.JWT_SECRET_KEY || "restogenie_secret_key_random_string_here_12345";

        if (!password || password !== adminPassword) {
            return NextResponse.json(
                { detail: "비밀번호가 일치하지 않습니다." },
                { status: 401 }
            );
        }

        // Generate JWT
        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + 86400; // 24 hours expiry

        const token = await new SignJWT({ sub: "admin" })
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .setExpirationTime(exp)
            .setIssuedAt(iat)
            .sign(new TextEncoder().encode(secretKey));

        return NextResponse.json({
            access_token: token,
            token_type: "bearer"
        });
    } catch (error: any) {
        console.error("Auth API Error:", error);
        return NextResponse.json(
            { detail: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
