import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';
import { DateTime } from 'luxon';
// import puppeteer from 'puppeteer-core';
// import chromium from '@sparticuz/chromium';

export const maxDuration = 60; // Allow 60s for PDF compilation

export async function POST(req: Request) {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    try {
        const { storeId, year, weekNumber } = await req.json();

        if (!storeId || !year || !weekNumber) {
            return NextResponse.json({ detail: "storeId, year, weekNumber가 필요합니다." }, { status: 400 });
        }

        // Logic Date Bounds
        const startOfWeekDate = DateTime.fromObject({ weekYear: year, weekNumber: weekNumber }).startOf('week');
        const endOfWeekDate = startOfWeekDate.endOf('week');

        // Fetch Data to inject into PDF Template
        const [store, sales, traffic] = await Promise.all([
            prisma.store.findUnique({ where: { id: parseInt(storeId, 10) } }),
            prisma.sale.groupBy({
                by: ['business_date'],
                where: { 
                    store_id: parseInt(storeId, 10), 
                    business_date: { 
                        gte: startOfWeekDate.toJSDate(),
                        lte: endOfWeekDate.toJSDate()
                    } 
                },
                _sum: { paid_amount: true },
                _count: { _all: true }
            }),
            prisma.footTraffic.groupBy({
                by: ['visit_date', 'widget_name'],
                where: { 
                    store_id: parseInt(storeId, 10), 
                    visit_date: { 
                        gte: startOfWeekDate.toJSDate(), 
                        lte: endOfWeekDate.toJSDate() 
                    } 
                },
                _sum: { visit_count: true }
            })
        ]);

        const totalSales = sales.reduce((acc, s) => acc + (s._sum.paid_amount || 0), 0);
        const totalVisits = traffic.filter(t => t.widget_name === '매장 방문').reduce((acc, t) => acc + (t._sum.visit_count || 0), 0);


        // Provide mock benchmarks
        const benchmarkCaptureRate = 1.2;
        const benchmarkATV = 14000;

        // Calculate actual metrics 
        const captureRate = totalVisits > 0 && totalSales > 0 ? (totalSales / totalVisits) * 100 : 0;
        const atv = totalSales > 0 && sales.length > 0 ? totalSales / sales.reduce((acc, s) => acc + s._count._all, 0) : 0;
        const mockRating = (Math.random() * (5.0 - 3.5) + 3.5).toFixed(1);

        let status = "normal";
        let alertTitle = "안정적인 서비스 운영 중";
        let alertDesc = "유동인구 대비 유입률과 객단가 모두 양호한 수준을 유지하고 있습니다.";

        if (captureRate < 1.0) {
            status = "critical";
            alertTitle = "풍요 속의 빈곤 (유입률 심각)";
            alertDesc = "상권 내 유동인구 대비 실제 매장 유입률이 평균을 크게 밑돌고 있습니다. 외관 가시성 점검이 시급합니다.";
        } else if (atv < benchmarkATV * 0.8) {
            status = "warning";
            alertTitle = "서비스 패러독스 (수익성 악화 우려)";
            alertDesc = "고객 방문은 다수 이루어지나 평균 객단가가 지속 하락 중입니다. 세트 메뉴 등의 묶음가격 유도가 필요합니다.";
        }

        const reportData = {
            id: storeId,
            name: store?.name || "매장명 미상",
            status,
            alertTitle,
            alertDesc,
            metrics: {
                traffic: `${totalVisits.toLocaleString()}명`,
                visitors: `${sales.reduce((acc, s) => acc + s._count._all, 0).toLocaleString()}건`,
                captureRate: `${captureRate.toFixed(1)}%`,
                atv: `${Math.round(atv).toLocaleString()}원`,
                rating: mockRating
            },
            benchmarks: {
                captureRate: `${benchmarkCaptureRate}%`,
                atv: `${benchmarkATV.toLocaleString()}원`
            },
            report: {
                causes: [
                    {
                        icon: "Store",
                        title: "1. 물리적 증거 관리 점검 (Chapter 8)",
                        desc: "점포 외관(Facade)의 가시성 척도 점검이 필요합니다. 상권 내 유동인구 대비 실제 진입 비율이 낮게 측정되고 있습니다."
                    },
                    {
                        icon: "Users",
                        title: "2. 수요와 가용능력 불균형 (Chapter 13)",
                        desc: "피크 타임 결제 이탈률이 관측됩니다. 4인석 위주의 테이블이 1~2인 고객으로 점유되어 가용능력 한계 병목이 발생 중입니다."
                    },
                    {
                        icon: "Utensils",
                        title: "3. 가격 및 촉진 전략 부재 (Chapter 9, 10)",
                        desc: `단품 판매 비율이 압도적입니다. 목표 객단가 ${benchmarkATV.toLocaleString()}원 방어를 위해 세트(Bundling) 메뉴 재편성과 키오스크 노출이 시급합니다.`
                    }
                ],
                actions: [
                    {
                        type: status === "critical" ? "urgent" : "normal",
                        title: "[Action 1] 물리적 증거 시각적 촉진 전략",
                        desc: "매장 전면에 '시간 한정 미끼 상품' X-배너 설치 유도",
                        btn: "X-배너 시안 지점 발송"
                    },
                    {
                        type: "normal",
                        title: "[Action 2] 가용능력 증대를 위한 레이아웃 재배치",
                        desc: "테이블 레이아웃을 2인석 단위로 분리하여 유연성 극대화",
                        btn: "슈퍼바이저 현장 점검"
                    },
                    {
                        type: "normal",
                        title: "[Action 3] 스마트 업셀링 키오스크 마케팅",
                        desc: "테이블 오더 및 키오스크 첫 화면에 객단가가 높은 2인 추천 세트를 기본값으로 배치",
                        btn: "키오스크 UI 원격 업데이트"
                    }
                ]
            }
        };

        // Return JSON structured AI Consulting Report
        return NextResponse.json({ 
            status: "success",
            detail: "보고서 데이터 생성 완료", 
            data: reportData
        });

    } catch (e: any) {
        return NextResponse.json({ detail: e.message || "보고서 생성 실패" }, { status: 500 });
    }
}
