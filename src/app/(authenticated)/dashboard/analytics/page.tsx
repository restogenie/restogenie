"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import { useStore } from '@/lib/StoreContext';
import { RefreshCw, TrendingUp, TrendingDown, BarChart3, CalendarRange, Utensils, FileText, Printer, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend, ComposedChart } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const COLORS = ['#3182F6', '#00C471', '#F9A825', '#F04452', '#8B95A1', '#8A2BE2'];

export default function AnalyticsPage() {
    const { currentStore } = useStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<any>(null);

    // Date Filters (Default 7 days for better WoW baseline)
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Report State
    const [reportHtml, setReportHtml] = useState<string | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

    const fetchReport = async () => {
        if (!currentStore) return;
        if (reportHtml) return; // Already fetched
        setReportLoading(true);
        try {
            const currentDate = new Date(endDate);
            const year = currentDate.getFullYear();
            const d = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
            const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);

            const res = await axios.post('/api/v1/reports', { storeId: currentStore.id, year, weekNumber });
            if (res.data.htmlSnippet) {
                setReportHtml(res.data.htmlSnippet);
            }
        } catch (err: any) {
            toast.error("리포트 생성 실패: " + (err.response?.data?.detail || err.message));
        } finally {
            setReportLoading(false);
        }
    };

    const fetchAnalytics = async (isRefresh = false) => {
        if (!currentStore) return;

        try {
            if (isRefresh) setRefreshing(true); else setLoading(true);

            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("admin_token="))
                ?.split("=")[1];

            if (!token) {
                window.location.href = '/login';
                return;
            }

            const res = await axios.get(`/api/v1/analytics?store_id=${currentStore.id}&start_date=${startDate}&end_date=${endDate}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setData(res.data.data);
            }
        } catch (err: any) {
            console.error('Failed to fetch analytics', err);
            if (err.response?.status === 401) {
                window.location.href = '/login';
            } else {
                toast.error("데이터를 불러오는데 실패했습니다.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [startDate, endDate, currentStore]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR').format(val);

    const renderDelta = (val: number) => {
        if (val > 0) return <span className="text-[#F04452] flex items-center text-sm font-semibold"><TrendingUp className="w-4 h-4 mr-1" />+{val}%</span>;
        if (val < 0) return <span className="text-[#3182F6] flex items-center text-sm font-semibold"><TrendingDown className="w-4 h-4 mr-1" />{val}%</span>;
        return <span className="text-[#8B95A1] flex items-center text-sm font-semibold">-</span>;
    };

    // Heatmap Matrix builder
    const renderHeatmap = () => {
        if (!data?.dayHourHeatmap) return null;

        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const hours = Array.from({ length: 24 }, (_, i) => i);

        // Find max to calculate opacity
        const maxRevenue = Math.max(...data.dayHourHeatmap.map((d: any) => d.revenue), 1);

        const matrix: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
        data.dayHourHeatmap.forEach((item: any) => {
            matrix[item.dayIndex][item.hour] = item.revenue;
        });

        return (
            <div className="w-full overflow-x-auto">
                <div className="min-w-[700px]">
                    <div className="flex mb-1">
                        <div className="w-12 flex-shrink-0"></div>
                        {hours.map(h => (
                            <div key={h} className="flex-1 text-center text-[10px] text-[#8B95A1]">{h}시</div>
                        ))}
                    </div>
                    {days.map((day, dIdx) => (
                        <div key={day} className="flex mb-1 items-center">
                            <div className="w-12 flex-shrink-0 text-xs font-medium text-[#4E5968]">{day}요일</div>
                            {hours.map(h => {
                                const val = matrix[dIdx][h];
                                const intensity = val > 0 ? 0.1 + (val / maxRevenue) * 0.9 : 0;
                                return (
                                    <div
                                        key={`${dIdx}-${h}`}
                                        className="flex-1 h-8 mx-0.5 rounded-sm transition-all hover:ring-2 hover:ring-[#3182F6] relative group"
                                        style={{ backgroundColor: intensity > 0 ? `rgba(49, 130, 246, ${intensity})` : '#F2F4F6' }}
                                    >
                                        <div className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#191F28] text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 shadow-lg">
                                            {day}요일 {h}시: ₩{formatCurrency(val)} ({((val / (data.totalRevenue || 1)) * 100).toFixed(1)}%)
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#191F28] mb-2">심층 분석 리포트</h1>
                    <p className="text-[#8B95A1] font-medium">데이터에 기반한 비즈니스 의사결정을 위한 다차원 분석.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-white border border-[#E5E8EB] rounded-md px-3 py-2 shadow-sm font-medium text-sm text-[#4E5968] gap-2">
                        <CalendarRange className="w-4 h-4 text-[#8B95A1]" />
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="outline-none bg-transparent" />
                        <span>~</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="outline-none bg-transparent" />
                    </div>

                    <button
                        onClick={() => fetchAnalytics(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E8EB] text-[#4E5968] rounded-md font-semibold hover:bg-[#F2F4F6] transition-colors shadow-sm"
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                        업데이트
                    </button>
                </div>
            </div>

            <Tabs defaultValue="analytics" onValueChange={(val) => { if (val === 'report') fetchReport(); }} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 max-w-lg shadow-sm border border-[#E5E8EB]">
                    <TabsTrigger value="analytics" className="text-sm font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">심층 매출 분석</TabsTrigger>
                    <TabsTrigger value="report" className="text-sm font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">주간 리포트 (웹뷰어)</TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="space-y-8 mt-0">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3182F6]"></div>
                            <p className="text-[#8B95A1]">심층 분석 데이터를 처리 중입니다...</p>
                        </div>
                    ) : !data || data.totalRevenue === 0 ? (
                        <div className="bg-white rounded-md border border-[#F2F4F6] p-16 text-center shadow-sm">
                            <TrendingUp className="w-12 h-12 text-[#D1D6DB] mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-[#191F28] mb-2">분석할 데이터가 없습니다</h3>
                            <p className="text-[#8B95A1]">선택한 기간 내에 결제 데이터가 존재하지 않습니다.<br />우측 상단 날짜를 변경해보세요.</p>
                        </div>
                    ) : (
                        <>
                            {/* Top Summary Cards with Deltas */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white rounded-xl shadow-sm border border-[#F2F4F6] p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <TrendingUp className="w-16 h-16 text-[#3182F6]" />
                                    </div>
                                    <h3 className="text-sm font-bold text-[#8B95A1] mb-2">총 매출 (Revenue)</h3>
                                    <div className="text-3xl font-bold tracking-tight text-[#191F28] mb-3">
                                        ₩{formatCurrency(data.totalRevenue)}
                                    </div>
                                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#F2F4F6]">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-[#8B95A1] mb-1">전주 대비 (WoW)</span>
                                            {renderDelta(data.deltas.wowRevenue)}
                                        </div>
                                        <div className="w-[1px] h-8 bg-[#F2F4F6]"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-[#8B95A1] mb-1">전달 대비 (MoM)</span>
                                            {renderDelta(data.deltas.momRevenue)}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-[#F2F4F6] p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <TrendingUp className="w-16 h-16 text-[#00C471]" />
                                    </div>
                                    <h3 className="text-sm font-bold text-[#8B95A1] mb-2">주문 건수 (Orders)</h3>
                                    <div className="text-3xl font-bold tracking-tight text-[#191F28] mb-3">
                                        {formatCurrency(data.totalOrders)}
                                        <span className="text-lg font-medium text-[#8B95A1] ml-1">건</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#F2F4F6]">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-[#8B95A1] mb-1">전주 대비 (WoW)</span>
                                            {renderDelta(data.deltas.wowOrders)}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-[#F2F4F6] p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <TrendingUp className="w-16 h-16 text-[#F9A825]" />
                                    </div>
                                    <h3 className="text-sm font-bold text-[#8B95A1] mb-2">객단가 (AOV)</h3>
                                    <div className="text-3xl font-bold tracking-tight text-[#191F28] mb-3">
                                        ₩{formatCurrency(data.funnel.aov)}
                                    </div>
                                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#F2F4F6]">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] text-[#8B95A1] mb-1">전주 대비 (WoW)</span>
                                            {renderDelta(data.deltas.wowAOV)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5-Step Customer Journey Flow */}
                            <div className="bg-white rounded-xl shadow-sm border border-[#F2F4F6] p-6">
                                <h3 className="text-lg font-bold text-[#191F28] mb-1 flex items-center gap-2">
                                    <ArrowRight className="w-5 h-5 text-indigo-500" />
                                    5단계 고객 여정 분석 (Journey Flow)
                                </h3>
                                <p className="text-sm text-[#8B95A1] mb-8">잠재 고객이 매장을 인지하고 최종적으로 충성 고객이 되기까지의 전체 흐름을 파악합니다.</p>
                                
                                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 w-full">
                                    {/* Step 1 */}
                                    <div className="flex-1 w-full bg-[#FAFAFA] border border-[#E5E8EB] rounded-lg p-5 flex flex-col items-center text-center relative">
                                        <div className="w-8 h-8 rounded-full bg-[#E5E8EB] text-[#4E5968] flex items-center justify-center font-bold text-sm absolute -top-4 shadow-sm border-2 border-white">1</div>
                                        <span className="text-xs font-bold text-[#8B95A1] mb-2 bg-white px-2 py-1 rounded shadow-sm border border-[#F2F4F6]">노출/인지</span>
                                        <h4 className="text-base font-bold text-[#333D4B] mb-1">유동인구</h4>
                                        <div className="text-2xl font-black text-[#191F28]">{formatCurrency(data.funnel.traffic)}<span className="text-sm font-medium text-[#8B95A1] ml-1">명</span></div>
                                    </div>
                                    <ArrowRight className="text-[#D1D6DB] w-6 h-6 hidden lg:block flex-shrink-0" />

                                    {/* Step 2 */}
                                    <div className="flex-1 w-full bg-[#F0F6FF] border border-[#DCEAFC] rounded-lg p-5 flex flex-col items-center text-center relative">
                                        <div className="w-8 h-8 rounded-full bg-[#3182F6] text-white flex items-center justify-center font-bold text-sm absolute -top-4 shadow-sm border-2 border-white">2</div>
                                        <span className="text-xs font-bold text-[#3182F6] mb-2 bg-white px-2 py-1 rounded shadow-sm border border-[#DCEAFC]">방문 전환</span>
                                        <h4 className="text-base font-bold text-[#191F28] mb-1">입장객</h4>
                                        <div className="text-2xl font-black text-[#3182F6]">{formatCurrency(data.funnel.visit)}<span className="text-sm font-medium text-[#8B95A1] ml-1">명</span></div>
                                        <div className="text-[10px] text-[#4E5968] mt-2 font-medium bg-white px-2 py-0.5 rounded-full border border-[#DCEAFC]">전환율: {data.funnel.traffic > 0 ? ((data.funnel.visit / data.funnel.traffic) * 100).toFixed(1) : 0}%</div>
                                    </div>
                                    <ArrowRight className="text-[#D1D6DB] w-6 h-6 hidden lg:block flex-shrink-0" />

                                    {/* Step 3 */}
                                    <div className="flex-1 w-full bg-[#FFF0F2] border border-[#FCE1E4] rounded-lg p-5 flex flex-col items-center text-center relative">
                                        <div className="w-8 h-8 rounded-full bg-[#F04452] text-white flex items-center justify-center font-bold text-sm absolute -top-4 shadow-sm border-2 border-white">3</div>
                                        <span className="text-xs font-bold text-[#F04452] mb-2 bg-white px-2 py-1 rounded shadow-sm border border-[#FCE1E4]">구매 전환</span>
                                        <h4 className="text-base font-bold text-[#191F28] mb-1">실주문 (결제)</h4>
                                        <div className="text-2xl font-black text-[#F04452]">{formatCurrency(data.funnel.order)}<span className="text-sm font-medium text-[#8B95A1] ml-1">건</span></div>
                                        <div className="text-[10px] text-[#4E5968] mt-2 font-medium bg-white px-2 py-0.5 rounded-full border border-[#FCE1E4]">전환율: {data.funnel.visit > 0 ? ((data.funnel.order / data.funnel.visit) * 100).toFixed(1) : 0}%</div>
                                    </div>
                                    <ArrowRight className="text-[#D1D6DB] w-6 h-6 hidden lg:block flex-shrink-0" />

                                    {/* Step 4 */}
                                    <div className="flex-1 w-full bg-[#FDF9EA] border border-[#FBE6A0] rounded-lg p-5 flex flex-col items-center text-center relative">
                                        <div className="w-8 h-8 rounded-full bg-[#F9A825] text-white flex items-center justify-center font-bold text-sm absolute -top-4 shadow-sm border-2 border-white">4</div>
                                        <span className="text-xs font-bold text-[#F9A825] mb-2 bg-white px-2 py-1 rounded shadow-sm border border-[#FBE6A0]">수익 극대화</span>
                                        <h4 className="text-base font-bold text-[#191F28] mb-1">고객 객단가</h4>
                                        <div className="text-2xl font-black text-[#F9A825]">₩{formatCurrency(data.funnel.aov)}</div>
                                    </div>
                                    <ArrowRight className="text-[#D1D6DB] w-6 h-6 hidden lg:block flex-shrink-0" />

                                    {/* Step 5 */}
                                    <div className="flex-1 w-full bg-[#F4F0FF] border border-[#E9DFFF] rounded-lg p-5 flex flex-col items-center text-center relative">
                                        <div className="w-8 h-8 rounded-full bg-[#8A2BE2] text-white flex items-center justify-center font-bold text-sm absolute -top-4 shadow-sm border-2 border-white">5</div>
                                        <span className="text-xs font-bold text-[#8A2BE2] mb-2 bg-white px-2 py-1 rounded shadow-sm border border-[#E9DFFF]">브랜드 충성도</span>
                                        <h4 className="text-base font-bold text-[#191F28] mb-1">고객 재방문율</h4>
                                        <div className="text-2xl font-black text-[#8A2BE2]">{data.funnel.retention}%</div>
                                    </div>
                                </div>
                            </div>

                            {/* Revenue Trend Chart */}
                            <div className="bg-white rounded-md shadow-sm border border-[#F2F4F6] p-6 mt-6">
                                <div className="flex items-center gap-2 mb-6">
                                    <BarChart3 className="w-5 h-5 text-[#3182F6]" />
                                    <h3 className="text-lg font-bold text-[#191F28]">일별 매출 및 주문수 추세</h3>
                                </div>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={data.revenueTrend} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E8EB" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8B95A1' }} dy={10} />
                                            <YAxis yAxisId="left" tickFormatter={(v) => `₩${(v / 10000).toFixed(0)}만`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8B95A1' }} dx={-10} />
                                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8B95A1' }} dx={10} />
                                            <RechartsTooltip
                                                cursor={{ fill: '#F9FAFB' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                                            <Bar yAxisId="left" dataKey="revenue" name="매출액" fill="#3182F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            <Line yAxisId="right" type="monotone" dataKey="orders" name="주문건수" stroke="#F9A825" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                {/* Heatmap */}
                                <div className="bg-white rounded-md shadow-sm border border-[#F2F4F6] p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp className="w-5 h-5 text-[#F04452]" />
                                                <h3 className="text-lg font-bold text-[#191F28]">요일 및 시간대별 매출 집중도</h3>
                                            </div>
                                            <p className="text-xs text-[#8B95A1]">색이 진할수록 해당 시간에 매출이 집중됨을 의미합니다.</p>
                                        </div>
                                    </div>
                                    {renderHeatmap()}
                                </div>

                                {/* Pie Charts */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white rounded-md shadow-sm border border-[#F2F4F6] p-5 flex flex-col items-center justify-center">
                                        <h4 className="text-sm font-bold text-[#4E5968] mb-4 text-left w-full">결제 수단 비중</h4>
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsPieChart>
                                                    <Pie data={data.paymentMethods} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                                        {data.paymentMethods.map((e: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(v: any) => `₩${formatCurrency(v)}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                                                </RechartsPieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-md shadow-sm border border-[#F2F4F6] p-5 flex flex-col items-center justify-center">
                                        <h4 className="text-sm font-bold text-[#4E5968] mb-4 text-left w-full">주문 채널 비중</h4>
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsPieChart>
                                                    <Pie data={data.channels} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                                        {data.channels.map((e: any, i: number) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(v: any) => `₩${formatCurrency(v)}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                                                </RechartsPieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced ABC Analysis */}
                            <div className="bg-white rounded-md shadow-sm border border-[#F2F4F6] overflow-hidden mt-6">
                                <div className="px-6 py-5 border-b border-[#F2F4F6] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Utensils className="w-5 h-5 text-[#00C471]" />
                                        <div>
                                            <h3 className="text-lg font-bold text-[#191F28]">메뉴별 ABC 매출기여도 분석</h3>
                                            <p className="text-xs text-[#8B95A1] mt-0.5">A등급(누적 70% 이내 핵심메뉴) / B등급(71~90% 보조메뉴) / C등급(91~100% 비인기메뉴)</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full min-w-[700px] text-left border-collapse whitespace-nowrap">
                                        <thead>
                                            <tr className="bg-[#F9FAFB] border-b border-[#F2F4F6]">
                                                <th className="px-6 py-4 text-sm font-semibold text-[#4E5968] w-20">등급</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-[#4E5968]">상품명</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-[#4E5968] text-right">총 판매수량</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-[#4E5968] text-right">매출액</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-[#4E5968] text-center">전주 대비 (WoW)</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-[#4E5968] text-right">매출 누적비중</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F2F4F6]">
                                            {data.abcAnalysis.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold",
                                                            item.grade === 'A' ? "bg-[#E8F8EE] text-[#00C471]" :
                                                                item.grade === 'B' ? "bg-[#E8F3FF] text-[#3182F6]" :
                                                                    "bg-[#F2F4F6] text-[#8B95A1]"
                                                        )}>
                                                            {item.grade}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-[#191F28]">
                                                        {item.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-[#4E5968] text-right">
                                                        {formatCurrency(item.quantity)}개
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-[#3182F6] text-right">
                                                        ₩{formatCurrency(item.revenue)}
                                                    </td>
                                                    <td className="px-6 py-4 flex justify-center mt-2.5">
                                                        {item.revenueDelta !== null ? renderDelta(item.revenueDelta) : <span className="text-[#8B95A1] text-xs font-medium">신규 진입</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-[#8B95A1] text-right font-mono">
                                                        {item.cumulativePercent.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {data.abcAnalysis.length === 0 && (
                                        <div className="py-12 text-center text-[#8B95A1] text-sm">표시할 메뉴 데이터가 없습니다.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>

                <TabsContent value="report" className="space-y-6 mt-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-lg border border-[#F2F4F6] shadow-sm gap-4">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2 text-[#191F28]">
                                <FileText className="w-6 h-6 text-indigo-500" />
                                자동화 리포트
                            </h2>
                            <p className="text-sm text-[#8B95A1] mt-1">AI가 분석한 한 주간의 매장 운영 성과를 웹에서 확인하고 PDF로 보관하세요.</p>
                        </div>
                        <button
                            onClick={() => {
                                const newWindow = window.open();
                                if (newWindow && reportHtml) {
                                    newWindow.document.write(reportHtml);
                                    newWindow.document.close();
                                    setTimeout(() => newWindow.print(), 500);
                                }
                            }}
                            disabled={reportLoading || !reportHtml}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#191F28] hover:bg-[#333D4B] text-white rounded-md font-bold transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
                        >
                            {reportLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                            PDF 다운로드
                        </button>
                    </div>

                    <div className="bg-white border text-black border-[#E5E8EB] rounded-lg shadow-md w-full min-h-[800px] flex items-center justify-center p-0 overflow-hidden relative">
                        {reportLoading ? (
                            <div className="flex flex-col items-center text-gray-400 py-32">
                                <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                                <p className="font-medium text-[#4E5968]">리포트를 생성 중입니다...</p>
                                <p className="text-sm mt-2 text-[#8B95A1]">해당 작업은 약 10~15초 소요될 수 있습니다.</p>
                            </div>
                        ) : reportHtml ? (
                            <div 
                                className="w-full h-full min-h-[1000px] mx-auto bg-white"
                                dangerouslySetInnerHTML={{ __html: reportHtml }} 
                            />
                        ) : (
                            <div className="text-[#8B95A1] font-medium py-32">데이터가 없습니다.</div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
