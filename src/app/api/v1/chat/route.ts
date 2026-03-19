import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';
import { streamText, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { decrypt } from '@/lib/encryption';

import { DateTime } from 'luxon';

export const maxDuration = 60; // Allow longer generation times

export async function POST(req: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    try {
        const { messages, storeId, engine, currentPath } = await req.json();

        if (!messages || messages.length === 0) {
            return NextResponse.json({ detail: "Messages are required" }, { status: 400 });
        }
        if (!storeId) {
            return NextResponse.json({ detail: "storeId is required" }, { status: 400 });
        }

        // Fetch User's API Key for the chosen engine
        const requestedEngine = engine || "GEMINI"; // Fallback to Gemini
        const apiKeyRecord = await prisma.aiApiKey.findFirst({
            where: { user_id: user.id, engine: requestedEngine, is_active: true }
        });

        if (!apiKeyRecord) {
            return NextResponse.json({ detail: `${requestedEngine} API 키가 등록되지 않았습니다. 설정 메뉴에서 키를 등록해주세요.` }, { status: 400 });
        }

        let rawApiKey = "";
        try {
            rawApiKey = decrypt(apiKeyRecord.encrypted_key);
        } catch(e) {
            return NextResponse.json({ detail: "API 키 복호화에 실패했습니다." }, { status: 500 });
        }

        // --- RAG Context Collection (Last 7 Days) ---
        // IMPORTANT: Always pass full ISO-8601 DateTime strings to Prisma to prevent
        // "premature end of input. Expected ISO-8601 DateTime" errors in Vercel Serverless.
        const lastWeekStartISO = new Date(DateTime.now().setZone('Asia/Seoul').minus({ days: 7 }).startOf('day').toMillis()).toISOString();
        const lastWeekEndISO = new Date(DateTime.now().setZone('Asia/Seoul').endOf('day').toMillis()).toISOString();

        const storeIdNum = parseInt(storeId, 10);
        const [store, sales, traffic] = await Promise.all([
            prisma.store.findUnique({ where: { id: storeIdNum } }),
            prisma.sale.groupBy({
                by: ['business_date'],
                where: { store_id: storeIdNum, business_date: { gte: lastWeekStartISO } },
                _sum: { paid_amount: true },
                _count: { _all: true }
            }),
            prisma.footTraffic.groupBy({
                by: ['visit_date', 'widget_name'],
                where: { store_id: storeIdNum, visit_date: { gte: lastWeekStartISO, lte: lastWeekEndISO } },
                _sum: { visit_count: true }
            })
        ]);

        let contextString = `[사업장 정보]\n이름: ${store?.name || '알 수 없음'}\n\n`;
        
        // Convert currentPath to descriptive text
        let pageDesc = "일반 설명 페이지";
        if (currentPath?.includes('/dashboard/analytics')) pageDesc = "심층 분석 파트 (고객 충성도 및 주간 트렌드)";
        else if (currentPath?.includes('/dashboard/traffic')) pageDesc = "CCTV 유동인구 분석 파트 (트래픽 퍼널 및 연령/성별 매트릭스)";
        else if (currentPath?.includes('/dashboard/menu')) pageDesc = "메뉴 분석 파트 (ABCM 분석 및 메뉴별 상세 판매액)";
        else if (currentPath?.includes('/dashboard')) pageDesc = "종합 대시보드 (전반적인 일간/월간 매출 요약)";
        else if (currentPath?.includes('/mapping')) pageDesc = "메뉴 매핑 관리 파트 (배달앱과 POS상 메뉴명 매칭)";
        else if (currentPath?.includes('/settings')) pageDesc = "환경 설정 및 API 키, POS 연동 관리 파트";

        contextString += `[현재 사용자 화면 위치]\n${pageDesc} (${currentPath || '/unknown'})\n\n`;

        contextString += `[최근 7일 매출 현황]\n`;
        sales.forEach(s => {
            contextString += `- ${s.business_date}: ${s._count._all}건 / ${s._sum.paid_amount?.toLocaleString()}원\n`;
        });
        
        contextString += `\n[최근 7일 유동인구 현황]\n`;
        traffic.forEach(t => {
            contextString += `- ${DateTime.fromJSDate(t.visit_date).toFormat('yyyy-MM-dd')} (${t.widget_name}): ${t._sum.visit_count}명\n`;
        });
        // ----------------------------------------------

        // Initialize Native Provider model based on User Selection
        let aiModel;
        
        switch (requestedEngine) {
            case 'OPENAI':
                const openai = createOpenAI({ apiKey: rawApiKey });
                aiModel = openai('gpt-4o');
                break;
            case 'GEMINI':
                const google = createGoogleGenerativeAI({ apiKey: rawApiKey });
                aiModel = google('gemini-2.5-flash');
                break;
            case 'CLAUDE':
                const anthropic = createAnthropic({ apiKey: rawApiKey });
                aiModel = anthropic('claude-3-5-sonnet-20241022');
                break;
            default:
                const defaultGoogle = createGoogleGenerativeAI({ apiKey: rawApiKey });
                aiModel = defaultGoogle('gemini-2.5-flash');
                break;
        }

        // Use generateText for robust error handling (streamText errors bypass try-catch mid-stream)
        try {
            const result = await generateText({
                model: aiModel as any,
                messages: messages,
                system: `You are an expert F&B business data analyst and consultant for 'RESTOGENIE', a smart dashboard platform.
Your goal is to answer the user's questions concerning their restaurant data, sales, foot traffic, and operations.
Always be polite, professional, and precise. Base your answers strictly on the provided context if relevant. Use Markdown formatting.
Respond in Korean.
Today's date is ${DateTime.now().setZone('Asia/Seoul').toFormat('yyyy-MM-dd (EEE)')}.

=== Database Context (Last 7 Days) ===
${contextString}
======================================`,
            });

            // Return as a Vercel AI SDK compatible data stream response
            // useChat expects this specific format
            const encoder = new TextEncoder();
            const responseText = result.text || "죄송합니다. 응답을 생성하지 못했습니다.";
            
            // Build AI SDK Data Stream Protocol response
            // Format: each chunk is a line with format "0:<json-encoded-string>\n"
            const chunks = responseText.match(/.{1,100}/g) || [responseText];
            const stream = new ReadableStream({
                start(controller) {
                    for (const chunk of chunks) {
                        controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
                    }
                    // Send finish message
                    controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
                    controller.close();
                }
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'X-Vercel-AI-Data-Stream': 'v1',
                },
            });
        } catch (aiError: any) {
            console.error("AI Generation Error:", aiError);
            // Return the error message as a readable AI response instead of crashing
            const errorMsg = `⚠️ AI 응답 생성 중 오류가 발생했습니다.\n\n**원인:** ${aiError.message || '알 수 없는 오류'}\n\n설정 메뉴에서 API 키를 확인하거나, 다른 AI 엔진으로 전환해 보세요.`;
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(errorMsg)}\n`));
                    controller.enqueue(encoder.encode(`d:{"finishReason":"error","usage":{"promptTokens":0,"completionTokens":0}}\n`));
                    controller.close();
                }
            });
            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'X-Vercel-AI-Data-Stream': 'v1',
                },
            });
        }
        
    } catch (e: any) {
        console.error("Chat API Error:", e);
        return NextResponse.json({ detail: e.message || "서버 내부 오류" }, { status: 500 });
    }
}
