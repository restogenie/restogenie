import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";

export async function GET(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    try {
        const keys = await prisma.aiApiKey.findMany({
            where: { user_id: user.id },
            select: { id: true, engine: true, is_active: true, created_at: true, updated_at: true },
            orderBy: { created_at: 'desc' }
        });

        return NextResponse.json({ keys });
    } catch (error: any) {
        console.error("AI Key GET Error:", error);
        return NextResponse.json({ detail: "서버 에러가 발생했습니다." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { engine, key } = body;

        if (!engine || !key) {
            return NextResponse.json({ detail: "엔진과 API Key를 모두 입력해주세요." }, { status: 400 });
        }

        // Encrypt the key
        const encrypted = encrypt(key);

        // Upsert based on composite unique constraint
        const result = await prisma.aiApiKey.upsert({
            where: { user_id_engine: { user_id: user.id, engine: engine } },
            update: { encrypted_key: encrypted, is_active: true, updated_at: new Date() },
            create: {
                user_id: user.id,
                engine: engine,
                encrypted_key: encrypted,
                is_active: true
            }
        });

        return NextResponse.json({ success: true, id: result.id });
    } catch (error: any) {
        console.error("AI Key POST Error:", error);
        return NextResponse.json({ detail: "서버 에러가 발생했습니다." }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0", 10);

    if (!id) {
        return NextResponse.json({ detail: "Missing ID" }, { status: 400 });
    }

    try {
        await prisma.aiApiKey.delete({
            where: { id: id, user_id: user.id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("AI Key DELETE Error:", error);
        return NextResponse.json({ detail: "삭제 실패" }, { status: 500 });
    }
}
