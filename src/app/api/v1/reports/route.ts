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

        // Example Elegant HTML Layout to render to PDF
        const htmlTemplate = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Pretendard', sans-serif; color: #191F28; padding: 40px; margin: 0; background-color: #F9FAFB; }
                    .page { background: white; padding: 60px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                    .header { border-bottom: 2px solid #E5E8EB; padding-bottom: 20px; margin-bottom: 40px; }
                    .title { font-size: 28px; font-weight: 800; color: #191F28; margin: 0; }
                    .subtitle { font-size: 16px; color: #8B95A1; margin-top: 8px; }
                    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px; }
                    .kpi-card { background: #F2F4F6; padding: 24px; border-radius: 12px; text-align: center; }
                    .kpi-value { font-size: 32px; font-weight: 700; color: #4F46E5; margin-top: 12px; }
                    .kpi-label { font-size: 14px; color: #4E5968; font-weight: 500; }
                    .section-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; margin-top: 48px; border-left: 4px solid #4F46E5; padding-left: 12px;}
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    th, td { border: 1px solid #E5E8EB; padding: 12px; text-align: left; }
                    th { background: #F2F4F6; font-size: 14px; color: #4E5968; }
                    td { font-size: 14px; color: #333D4B; }
                    .footer { margin-top: 60px; text-align: center; color: #B0B8C1; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        <h1 class="title">${store?.name} 주간 심층 리포트</h1>
                        <p class="subtitle">${year}년 ${weekNumber}주차 (${startOfWeekDate.toFormat('MM.dd')} - ${endOfWeekDate.toFormat('MM.dd')})</p>
                    </div>

                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <div class="kpi-label">주간 총 매출액</div>
                            <div class="kpi-value">${totalSales.toLocaleString()}원</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-label">주간 총 방문객 수 (메이아이)</div>
                            <div class="kpi-value">${totalVisits.toLocaleString()}명</div>
                        </div>
                    </div>

                    <h2 class="section-title">일자별 요약 현황</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>일자</th>
                                <th>결제 건수</th>
                                <th>매출액</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sales.map(s => `
                                <tr>
                                    <td>${DateTime.fromJSDate(s.business_date).toFormat('yyyy.MM.dd')}</td>
                                    <td>${s._count._all.toLocaleString()}건</td>
                                    <td>${(s._sum.paid_amount || 0).toLocaleString()}원</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="footer">
                        RESTOGENIE AI Analytics • Generated on ${DateTime.now().toFormat('yyyy.MM.dd HH:mm')}
                    </div>
                </div>
            </body>
            </html>
        `;

        // ---- Uncomment for actual PDF generation once Chromium path is resolved
        /*
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': \`attachment; filename="WeeklyReport_\${year}_W\${weekNumber}.pdf"\`,
            },
        });
        */

        // For now, return HTML for preview if requested, or just dummy response
        return NextResponse.json({ 
            detail: "보고서 템플릿 렌더링 준비 완료", 
            htmlSnippet: htmlTemplate,
            totalSales,
            totalVisits
        });

    } catch (e: any) {
        return NextResponse.json({ detail: e.message || "보고서 생성 실패" }, { status: 500 });
    }
}
