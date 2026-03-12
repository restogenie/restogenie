import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';

export async function GET(req: Request) {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');

    try {
        const sessions = await prisma.chatSession.findMany({
            where: {
                user_id: user.id,
                store_id: storeId ? parseInt(storeId, 10) : undefined
            },
            orderBy: { updated_at: 'desc' },
            include: {
                messages: {
                    orderBy: { created_at: 'asc' }
                }
            }
        });
        return NextResponse.json({ sessions });
    } catch (e: any) {
        return NextResponse.json({ detail: e.message || "서버 오류" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    try {
        const { id, title, storeId, messages } = await req.json();

        if (id) {
            // Update existing session
            await prisma.chatMessage.deleteMany({ where: { session_id: id } });
            
            const session = await prisma.chatSession.update({
                where: { id },
                data: {
                    updated_at: new Date(),
                    messages: {
                        create: messages.map((m: any) => ({
                            role: m.role,
                            content: m.content
                        }))
                    }
                },
                include: { messages: true }
            });
            return NextResponse.json({ session });
        } else {
            // Create new session
            const session = await prisma.chatSession.create({
                data: {
                    user_id: user.id,
                    store_id: storeId ? parseInt(storeId, 10) : 0,
                    title: title || "새로운 대화",
                    messages: {
                        create: messages.map((m: any) => ({
                            role: m.role,
                            content: m.content
                        }))
                    }
                },
                include: { messages: true }
            });
            return NextResponse.json({ session });
        }
    } catch (e: any) {
        return NextResponse.json({ detail: e.message || "서버 오류" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await req.json();
        await prisma.chatSession.delete({
            where: { id, user_id: user.id }
        });
        return NextResponse.json({ detail: "삭제 성공" });
    } catch (e: any) {
        return NextResponse.json({ detail: e.message || "삭제 실패" }, { status: 500 });
    }
}
