import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { decrypt } from '@/lib/encryption';
import { DateTime } from 'luxon';
import { z } from 'zod';

export const maxDuration = 60; // Allow 60s for AI generation

// --- Zod Schema for Structured AI Output ---
const ReportCauseSchema = z.object({
    icon: z.string().describe("Lucide icon name: 'Store', 'Users', 'Utensils', 'TrendingDown', 'Activity', or 'Frown'"),
    title: z.string().describe("원인 분석 제목 (예: '1. 물리적 증거 관리 실패 (Chapter 8)')"),
    desc: z.string().describe("2~3문장의 구체적 원인 설명. 반드시 제공된 수치 데이터를 인용하세요.")
});

const ReportActionSchema = z.object({
    type: z.enum(["urgent", "normal"]).describe("긴급도. 위험 상태일 때 첫 번째 액션은 'urgent'"),
    title: z.string().describe("실행 과제 제목 (예: '[Action 1] 물리적 증거 시각적 촉진 강화')"),
    desc: z.string().describe("SV(슈퍼바이저)가 즉시 실행할 수 있는 구체적 실행 방안 1~2문장"),
    btn: z.string().describe("CTA 버튼 라벨 (예: 'X-배너 시안 지점 발송')")
});

const AIReportSchema = z.object({
    status: z.enum(["critical", "warning", "normal"]).describe("매장 건전성 등급: critical(위험), warning(경계), normal(양호)"),
    alertTitle: z.string().describe("핵심 진단 한줄 요약 제목 (예: '풍요 속의 빈곤')"),
    alertDesc: z.string().describe("진단 요약 설명 1~2문장"),
    causes: z.array(ReportCauseSchema).length(3).describe("서비스 마케팅 관점의 원인 분석 3가지"),
    actions: z.array(ReportActionSchema).length(3).describe("본사 SV가 즉시 실행 가능한 액션 플랜 3가지")
});

export async function POST(req: Request) {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    try {
        const { storeId, year, weekNumber } = await req.json();

        if (!storeId || !year || !weekNumber) {
            return NextResponse.json({ detail: "storeId, year, weekNumber가 필요합니다." }, { status: 400 });
        }

        // --- 1. Date Bounds ---
        const startOfWeekDate = DateTime.fromObject({ weekYear: year, weekNumber: weekNumber }).startOf('week');
        const endOfWeekDate = startOfWeekDate.endOf('week');
        const prevWeekStart = startOfWeekDate.minus({ weeks: 1 });
        const prevWeekEnd = endOfWeekDate.minus({ weeks: 1 });

        // --- 2. Fetch DB Data (Current + Previous Week) ---
        const sid = parseInt(storeId, 10);
        const [store, sales, prevSales, traffic, prevTraffic, topMenus] = await Promise.all([
            prisma.store.findUnique({ where: { id: sid } }),
            prisma.sale.groupBy({
                by: ['business_date'],
                where: { store_id: sid, business_date: { gte: startOfWeekDate.toJSDate(), lte: endOfWeekDate.toJSDate() } },
                _sum: { paid_amount: true },
                _count: { _all: true }
            }),
            prisma.sale.groupBy({
                by: ['business_date'],
                where: { store_id: sid, business_date: { gte: prevWeekStart.toJSDate(), lte: prevWeekEnd.toJSDate() } },
                _sum: { paid_amount: true },
                _count: { _all: true }
            }),
            prisma.footTraffic.groupBy({
                by: ['visit_date', 'widget_name'],
                where: { store_id: sid, visit_date: { gte: startOfWeekDate.toJSDate(), lte: endOfWeekDate.toJSDate() } },
                _sum: { visit_count: true }
            }),
            prisma.footTraffic.groupBy({
                by: ['visit_date', 'widget_name'],
                where: { store_id: sid, visit_date: { gte: prevWeekStart.toJSDate(), lte: prevWeekEnd.toJSDate() } },
                _sum: { visit_count: true }
            }),
            prisma.menuLineItem.groupBy({
                by: ['product_name'],
                where: { sale: { store_id: sid, business_date: { gte: startOfWeekDate.toJSDate(), lte: endOfWeekDate.toJSDate() } } },
                _sum: { total_price: true },
                _count: { _all: true },
                orderBy: { _sum: { total_price: 'desc' } },
                take: 10
            })
        ]);

        // --- 3. Calculate Core Metrics ---
        const totalSales = sales.reduce((a, s) => a + (s._sum.paid_amount || 0), 0);
        const totalOrders = sales.reduce((a, s) => a + s._count._all, 0);
        const prevTotalSales = prevSales.reduce((a, s) => a + (s._sum.paid_amount || 0), 0);
        const prevTotalOrders = prevSales.reduce((a, s) => a + s._count._all, 0);

        const totalFootTraffic = traffic.filter(t => t.widget_name === '유동인구').reduce((a, t) => a + (t._sum.visit_count || 0), 0);
        const totalStoreVisits = traffic.filter(t => t.widget_name === '매장 방문').reduce((a, t) => a + (t._sum.visit_count || 0), 0);
        const prevFootTraffic = prevTraffic.filter(t => t.widget_name === '유동인구').reduce((a, t) => a + (t._sum.visit_count || 0), 0);
        const prevStoreVisits = prevTraffic.filter(t => t.widget_name === '매장 방문').reduce((a, t) => a + (t._sum.visit_count || 0), 0);

        const atv = totalOrders > 0 ? totalSales / totalOrders : 0;
        const prevAtv = prevTotalOrders > 0 ? prevTotalSales / prevTotalOrders : 0;
        const captureRate = totalFootTraffic > 0 ? (totalStoreVisits / totalFootTraffic) * 100 : 0;

        const salesWoW = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales * 100).toFixed(1) : "N/A";
        const ordersWoW = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders * 100).toFixed(1) : "N/A";
        const atvWoW = prevAtv > 0 ? ((atv - prevAtv) / prevAtv * 100).toFixed(1) : "N/A";
        const trafficWoW = prevFootTraffic > 0 ? ((totalFootTraffic - prevFootTraffic) / prevFootTraffic * 100).toFixed(1) : "N/A";

        const menuRanking = topMenus.map((m: any, i: number) => `${i + 1}. ${m.product_name} (${(m._sum?.total_price || 0).toLocaleString()}원, ${m._count?._all || 0}건)`).join('\n');

        // --- 4. Build AI Context String ---
        const contextForAI = `
[매장 정보]
- 매장명: ${store?.name || '알 수 없음'}
- 분석 기간: ${year}년 ${weekNumber}주차 (${startOfWeekDate.toFormat('MM.dd')} ~ ${endOfWeekDate.toFormat('MM.dd')})

[이번 주 핵심 지표]
- 총 매출: ${totalSales.toLocaleString()}원 (전주 대비 ${salesWoW}%)
- 총 주문 건수: ${totalOrders.toLocaleString()}건 (전주 대비 ${ordersWoW}%)
- 평균 객단가(ATV): ${Math.round(atv).toLocaleString()}원 (전주 대비 ${atvWoW}%)
- 상권 유동인구: ${totalFootTraffic.toLocaleString()}명 (전주 대비 ${trafficWoW}%)
- 매장 방문 전환율: ${captureRate.toFixed(1)}%
- 매장 입장객수: ${totalStoreVisits.toLocaleString()}명

[전주 비교]
- 전주 매출: ${prevTotalSales.toLocaleString()}원
- 전주 주문 건수: ${prevTotalOrders.toLocaleString()}건
- 전주 유동인구: ${prevFootTraffic.toLocaleString()}명
- 전주 매장 방문: ${prevStoreVisits.toLocaleString()}명

[메뉴별 매출 TOP 10]
${menuRanking || '데이터 없음'}

[일자별 매출 상세]
${sales.map(s => `- ${DateTime.fromJSDate(s.business_date).toFormat('MM.dd(EEE)')}: ${(s._sum.paid_amount || 0).toLocaleString()}원 / ${s._count._all}건`).join('\n') || '데이터 없음'}
`.trim();

        // --- 5. Fetch User's AI API Key ---
        const apiKeyRecord = await prisma.aiApiKey.findFirst({
            where: { user_id: user.id, is_active: true },
            orderBy: { created_at: 'desc' }
        });

        let aiGeneratedReport = null;

        if (apiKeyRecord) {
            try {
                const rawApiKey = decrypt(apiKeyRecord.encrypted_key);
                let aiModel: any;

                switch (apiKeyRecord.engine) {
                    case 'OPENAI':
                        aiModel = createOpenAI({ apiKey: rawApiKey })('gpt-4o');
                        break;
                    case 'CLAUDE':
                        aiModel = createAnthropic({ apiKey: rawApiKey })('claude-3-5-sonnet-20241022');
                        break;
                    case 'GEMINI':
                    default:
                        aiModel = createGoogleGenerativeAI({ apiKey: rawApiKey })('gemini-2.5-flash');
                        break;
                }

                const { object } = await generateObject({
                    model: aiModel,
                    schema: AIReportSchema,
                    prompt: contextForAI,
                    system: `당신은 프랜차이즈 F&B 전문 경영 컨설턴트이자 서비스 마케팅 박사입니다.
제공된 POS 매출, 유동인구, 메뉴 판매 데이터를 분석하여 주간 경영 컨설팅 리포트를 작성하세요.

핵심 규칙:
1. 단순히 숫자를 나열하지 말고, 원인(왜 매출이 오르고 내렸는지)을 짚어주는 '대화형 텍스트(Conversational Data)' 형태로 작성하세요.
2. causes(원인 분석)에서는 서비스 마케팅 이론 챕터 번호를 반드시 인용하세요.
3. actions(실행 과제)에서는 SV(슈퍼바이저)가 즉시 실행할 수 있는 현장 점검 액션 플랜을 제시하세요.
4. 실적이 저조할수록 status를 'critical'이나 'warning'으로, 양호하면 'normal'로 판정하세요.
5. 모든 텍스트는 반드시 한국어로 작성하세요.
6. 제공된 수치를 적극적으로 인용하여 분석의 근거를 뒷받침하세요.`,
                });

                aiGeneratedReport = object;
            } catch (aiError: any) {
                console.error("AI Report Generation Error:", aiError.message);
                // AI fails → fall through to fallback
            }
        }

        // --- 6. Compose Final Response (AI or Fallback) ---
        const benchmarkCaptureRate = 1.2;
        const benchmarkATV = 14000;

        let reportPayload;

        if (aiGeneratedReport) {
            // AI-generated report
            reportPayload = {
                ...aiGeneratedReport,
                report: {
                    causes: aiGeneratedReport.causes,
                    actions: aiGeneratedReport.actions
                }
            };
            // Remove top-level causes/actions (they're nested under report)
            delete (reportPayload as any).causes;
            delete (reportPayload as any).actions;
        } else {
            // Fallback: rule-based static report
            let status = "normal";
            let alertTitle = "안정적인 서비스 운영 중";
            let alertDesc = "유동인구 대비 유입률과 객단가 모두 양호한 수준을 유지하고 있습니다.";

            if (captureRate > 0 && captureRate < 1.0) {
                status = "critical";
                alertTitle = "풍요 속의 빈곤 (유입률 심각)";
                alertDesc = "상권 내 유동인구 대비 실제 매장 유입률이 평균을 크게 밑돌고 있습니다.";
            } else if (atv < benchmarkATV * 0.8) {
                status = "warning";
                alertTitle = "서비스 패러독스 (수익성 악화 우려)";
                alertDesc = "고객 방문은 다수 이루어지나 평균 객단가가 하락 중입니다.";
            }

            reportPayload = {
                status,
                alertTitle,
                alertDesc,
                report: {
                    causes: [
                        { icon: "Store", title: "1. 물리적 증거 관리 점검 (Chapter 8)", desc: "점포 외관(Facade)의 가시성 척도 점검이 필요합니다." },
                        { icon: "Users", title: "2. 수요-가용능력 불균형 (Chapter 13)", desc: "피크 타임 결제 이탈률이 관측됩니다. 좌석 회전율 극대화가 필요합니다." },
                        { icon: "Utensils", title: "3. 가격 및 촉진 전략 부재 (Chapter 9, 10)", desc: "단품 판매 비율이 높습니다. 묶음가격(Bundling) 프로모션이 필요합니다." }
                    ],
                    actions: [
                        { type: "normal" as const, title: "[Action 1] 외관 가시성 강화", desc: "매장 전면 디지털 메뉴 보드 또는 프로모션 배너 설치", btn: "배너 시안 발송" },
                        { type: "normal" as const, title: "[Action 2] 좌석 레이아웃 재배치", desc: "2인석 단위 분리로 회전율 극대화", btn: "현장 점검 지시" },
                        { type: "normal" as const, title: "[Action 3] 업셀링 키오스크 마케팅", desc: "키오스크 첫 화면에 객단가 높은 세트 메뉴 배치", btn: "키오스크 UI 업데이트" }
                    ]
                }
            };
        }

        const responseData = {
            id: storeId,
            name: store?.name || "매장명 미상",
            ...reportPayload,
            metrics: {
                traffic: `${totalFootTraffic.toLocaleString()}명`,
                visitors: `${totalOrders.toLocaleString()}건`,
                captureRate: `${captureRate.toFixed(1)}%`,
                atv: `${Math.round(atv).toLocaleString()}원`,
                rating: "4.2"
            },
            benchmarks: {
                captureRate: `${benchmarkCaptureRate}%`,
                atv: `${benchmarkATV.toLocaleString()}원`
            },
            aiGenerated: !!aiGeneratedReport
        };

        return NextResponse.json({
            status: "success",
            detail: aiGeneratedReport ? "AI 컨설팅 리포트 생성 완료" : "규칙 기반 리포트 생성 완료 (AI 키 미등록)",
            data: responseData
        });

    } catch (e: any) {
        console.error("Report API Error:", e);
        return NextResponse.json({ detail: e.message || "보고서 생성 실패" }, { status: 500 });
    }
}
