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

        // Determine API key: user key > server fallback key
        let rawApiKey = "";
        let actualEngine = requestedEngine;
        
        if (apiKeyRecord) {
            try {
                rawApiKey = decrypt(apiKeyRecord.encrypted_key);
            } catch(e) {
                // User key decryption failed, will try fallback
            }
        }

        // If no user key, try server-side fallback keys
        if (!rawApiKey) {
            const fallbackGemini = process.env.FALLBACK_GEMINI_API_KEY;
            const fallbackOpenAI = process.env.FALLBACK_OPENAI_API_KEY;
            
            if (fallbackGemini) {
                rawApiKey = fallbackGemini;
                actualEngine = "GEMINI";
            } else if (fallbackOpenAI) {
                rawApiKey = fallbackOpenAI;
                actualEngine = "OPENAI";
            } else {
                return NextResponse.json({ detail: `API 키가 등록되지 않았습니다. 설정 메뉴에서 키를 등록해주세요.` }, { status: 400 });
            }
        }

        // --- RAG Context Collection (Last 90 Days for historical queries) ---
        const rangeDays = 90;
        const rangeStartISO = new Date(DateTime.now().setZone('Asia/Seoul').minus({ days: rangeDays }).startOf('day').toMillis()).toISOString();
        const rangeEndISO = new Date(DateTime.now().setZone('Asia/Seoul').endOf('day').toMillis()).toISOString();

        const storeIdNum = parseInt(storeId, 10);
        const [store, sales, traffic] = await Promise.all([
            prisma.store.findUnique({ where: { id: storeIdNum } }),
            prisma.sale.groupBy({
                by: ['business_date'],
                where: { store_id: storeIdNum, business_date: { gte: rangeStartISO, lte: rangeEndISO } },
                _sum: { paid_amount: true },
                _count: { _all: true },
                orderBy: { business_date: 'asc' }
            }),
            prisma.footTraffic.groupBy({
                by: ['visit_date', 'widget_name'],
                where: { store_id: storeIdNum, visit_date: { gte: rangeStartISO, lte: rangeEndISO } },
                _sum: { visit_count: true }
            })
        ]);

        let contextString = `[사업장 정보]\n이름: ${store?.name || '알 수 없음'}\n\n`;
        
        // Convert currentPath to descriptive text
        let pageDesc = "일반 설명 페이지";
        if (currentPath?.includes('/dashboard/analytics')) pageDesc = "심층 분석 파트";
        else if (currentPath?.includes('/dashboard/traffic')) pageDesc = "CCTV 유동인구 분석 파트";
        else if (currentPath?.includes('/dashboard')) pageDesc = "종합 대시보드";
        else if (currentPath?.includes('/mapping')) pageDesc = "메뉴 매핑 관리";
        else if (currentPath?.includes('/settings')) pageDesc = "환경 설정";

        contextString += `[화면 위치] ${pageDesc}\n\n`;

        // Group sales by week for cleaner context
        contextString += `[일별 매출 데이터 (최근 ${rangeDays}일)]\n`;
        contextString += `날짜 | 건수 | 매출액\n`;
        sales.forEach(s => {
            const dt = DateTime.fromJSDate(s.business_date).setZone('Asia/Seoul');
            contextString += `${dt.toFormat('yyyy-MM-dd(EEE)')} | ${s._count._all}건 | ${(s._sum.paid_amount || 0).toLocaleString()}원\n`;
        });
        
        contextString += `\n[유동인구 데이터]\n`;
        traffic.forEach(t => {
            contextString += `${DateTime.fromJSDate(t.visit_date).setZone('Asia/Seoul').toFormat('yyyy-MM-dd')} (${t.widget_name}): ${t._sum.visit_count}명\n`;
        });
        // ----------------------------------------------

        // --- Helper: create AI model from engine + key ---
        function createModel(eng: string, key: string) {
            switch (eng) {
                case 'OPENAI':
                    return createOpenAI({ apiKey: key })('gpt-4o');
                case 'CLAUDE':
                    return createAnthropic({ apiKey: key })('claude-3-5-sonnet-20241022');
                case 'GEMINI':
                default:
                    return createGoogleGenerativeAI({ apiKey: key })('gemini-3-flash-preview');
            }
        }

        const systemPrompt = `당신은 프랜차이즈 F&B 전문 경영 컨설턴트 'RESTOGENIE AI' 입니다.

## 역할
- 사용자가 요청하는 기간의 매출, 유동인구, 방문 전환율 등을 DB 데이터를 기반으로 정확하게 분석합니다.
- '2월 4주차'처럼 특정 기간을 언급하면, 제공된 데이터에서 해당 날짜 범위를 직접 찾아 분석하세요.

## 응답 형식 규칙 (매우 중요)
1. 반드시 **마크다운 형식**으로 응답하세요.
2. **##, ### 제목**, **표(| 열1 | 열2 |)**, **리스트(- 항목)**, **볼드/이탤릭** 등을 적극 활용하세요.
3. 숫자 데이터는 반드시 **마크다운 표**로 정리하세요:
   | 날짜 | 매출액 | 건수 | 전주 대비 |
   |---|---|---|---|
4. 핵심 인사이트는 **📊 📈 📉 🔍 💡** 등 이모지와 함께 **볼드**로 강조하세요.
5. 분석 결과는 다음 구조를 따르세요:
   - 📊 **요약 (Executive Summary)**
   - 📈 **상세 데이터 (표)**
   - 🔍 **핵심 인사이트**
   - 💡 **액션 제안**
6. 각 섹션 사이에 반드시 빈 줄을 넣어 가독성을 확보하세요.

## 기본 정보
- 오늘 날짜: ${DateTime.now().setZone('Asia/Seoul').toFormat('yyyy-MM-dd (EEE)')}
- 데이터 범위: 최근 90일

## DB 데이터
${contextString}
============================`;

        // --- Helper: call AI with direct REST API for Gemini 3 (SDK can't parse thoughtSignature) ---
        async function callGeminiDirect(apiKey: string, sysPrompt: string, msgs: any[]): Promise<string> {
            // Convert useChat messages format to Gemini API format
            const contents: any[] = [];
            for (const msg of msgs) {
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }

            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: sysPrompt }] },
                        contents,
                    })
                }
            );

            if (!res.ok) {
                const errBody = await res.text();
                throw new Error(`Gemini API Error (${res.status}): ${errBody.substring(0, 200)}`);
            }

            const data = await res.json();
            // Gemini 3 returns text + thoughtSignature in the SAME part object
            // Extract text from all parts that have a text field
            const text = data?.candidates?.[0]?.content?.parts
                ?.filter((p: any) => typeof p.text === 'string')
                ?.map((p: any) => p.text)
                ?.join('') || '';
            
            if (!text) {
                throw new Error('Gemini가 빈 응답을 반환했습니다.');
            }
            return text;
        }

        // --- Attempt with auto-fallback on quota errors ---
        let lastError: any = null;
        
        // Build attempt list: user key first, then server fallback(s)
        const attempts: { engine: string; key: string; label: string }[] = [
            { engine: actualEngine, key: rawApiKey, label: 'user' }
        ];
        
        // Add fallback keys if available (and different from what we already have)
        const fbGemini = process.env.FALLBACK_GEMINI_API_KEY;
        const fbOpenAI = process.env.FALLBACK_OPENAI_API_KEY;
        if (fbGemini && !(actualEngine === 'GEMINI' && rawApiKey === fbGemini)) {
            attempts.push({ engine: 'GEMINI', key: fbGemini, label: 'fallback-gemini' });
        }
        if (fbOpenAI && !(actualEngine === 'OPENAI' && rawApiKey === fbOpenAI)) {
            attempts.push({ engine: 'OPENAI', key: fbOpenAI, label: 'fallback-openai' });
        }

        for (const attempt of attempts) {
            try {
                let responseText: string;

                if (attempt.engine === 'GEMINI') {
                    // Direct REST API for Gemini 3 (bypasses SDK parsing bug)
                    responseText = await callGeminiDirect(attempt.key, systemPrompt, messages);
                } else {
                    // Use AI SDK for OpenAI/Claude
                    const aiModel = createModel(attempt.engine, attempt.key);
                    const result = await generateText({
                        model: aiModel as any,
                        messages: messages,
                        system: systemPrompt,
                    });
                    responseText = result.text || '';
                    if (!responseText.trim()) {
                        throw new Error(`AI 모델이 빈 응답을 반환했습니다. (engine: ${attempt.engine})`);
                    }
                }

                console.log(`AI Result [${attempt.label}]:`, responseText.substring(0, 100));

                // Build AI SDK Data Stream Protocol response
                const encoder = new TextEncoder();
                // Split by paragraphs (double newline) to preserve markdown formatting
                const chunks = responseText.split(/\n\n/).flatMap((para, i, arr) => 
                    i < arr.length - 1 ? [para + '\n\n'] : [para]
                ).filter(c => c.length > 0);
                const stream = new ReadableStream({
                    start(controller) {
                        for (const chunk of chunks) {
                            controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
                        }
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
                console.error(`AI attempt [${attempt.label}] failed:`, aiError.message);
                lastError = aiError;
                const msg = (aiError.message || '').toLowerCase();
                if (msg.includes('quota') || msg.includes('billing') || msg.includes('credit') || msg.includes('rate') || msg.includes('limit') || msg.includes('빈 응답')) {
                    continue;
                }
                break;
            }
        }

        // All attempts failed — return friendly error in chat
        const errorMsg = `⚠️ AI 응답 생성 중 오류가 발생했습니다.\n\n**원인:** ${lastError?.message || '알 수 없는 오류'}\n\n설정 메뉴에서 API 키를 확인하거나, 다른 AI 엔진으로 전환해 보세요.`;
        const encoder = new TextEncoder();
        const errorStream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode(`0:${JSON.stringify(errorMsg)}\n`));
                controller.enqueue(encoder.encode(`d:{"finishReason":"error","usage":{"promptTokens":0,"completionTokens":0}}\n`));
                controller.close();
            }
        });
        return new Response(errorStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Vercel-AI-Data-Stream': 'v1',
            },
        });
        
    } catch (e: any) {
        console.error("Chat API Error:", e);
        return NextResponse.json({ detail: e.message || "서버 내부 오류" }, { status: 500 });
    }
}

