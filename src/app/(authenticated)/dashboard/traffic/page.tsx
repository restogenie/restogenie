"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from '@/lib/StoreContext';
import { format, subDays } from 'date-fns';
import { DateTime } from 'luxon';
import { FileDown, RefreshCw, Users, ShoppingBag, Loader2, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DateRange } from "react-day-picker";
import { PresetDateRangePicker } from "@/components/Dashboard/PresetDateRangePicker";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, FunnelChart, Funnel, LabelList, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Area } from 'recharts';
import * as XLSX from 'xlsx';
import DemographicMatrix from '@/components/Dashboard/DemographicMatrix';

export default function TrafficDashboardPage() {
    const { currentStore } = useStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [syncing, setSyncing] = useState(false);
    
    const [trafficData, setTrafficData] = useState<any>(null);

    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date()
    });

    const fetchData = async (isRefresh = false) => {
        if (!currentStore) return;

        try {
            if (isRefresh) setRefreshing(true);

            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("admin_token="))
                ?.split("=")[1];

            if (!token) {
                window.location.href = '/login';
                return;
            }

            const startDateStr = date?.from ? format(date.from, 'yyyy-MM-dd') : format(subDays(new Date(), 30), 'yyyy-MM-dd');
            const endDateStr = date?.to ? format(date.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

            const res = await axios.get(`/api/v1/traffic?store_id=${currentStore.id}&start_date=${startDateStr}&end_date=${endDateStr}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setTrafficData(res.data);
            }
        } catch (error) {
            console.error("데이터 로딩 실패:", error);
            toast.error("데이터를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (currentStore) {
            setLoading(true);
            fetchData();
        }
    }, [currentStore, date]);

    const handleSync = async () => {
        if (!currentStore) return;
        setSyncing(true);
        toast.loading("CCTV 데이터 동기화를 시작합니다...", { id: 'cctvSync' });

        try {
            const startDateStr = date?.from ? format(date.from, 'yyyy-MM-dd') : format(subDays(new Date(), 30), 'yyyy-MM-dd');
            const endDateStr = date?.to ? format(date.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

            const res = await axios.post(`/api/v1/sync/mayi`, { store_id: currentStore.id, start_date: startDateStr, end_date: endDateStr });
            if (res.data.success) {
                toast.success(res.data.message || "동기화 완료!", { id: 'cctvSync' });
                // Re-fetch data after sync
                await fetchData(true);
            } else {
                toast.error("동기화 실패", { id: 'cctvSync' });
            }
        } catch (error: any) {
            toast.error(`동기화 오류: ${error.response?.data?.detail || error.message}`, { id: 'cctvSync' });
        } finally {
            setSyncing(false);
        }
    };

    const handleExport = () => {
        if (!trafficData) return;
        try {
            const wb = XLSX.utils.book_new();
            
            // Time sheet
            const timeWs = XLSX.utils.json_to_sheet(trafficData.timeData);
            XLSX.utils.book_append_sheet(wb, timeWs, "시간대별_방문");

            // Demo sheet
            const demoWs = XLSX.utils.json_to_sheet(trafficData.demoData);
            XLSX.utils.book_append_sheet(wb, demoWs, "연령성별_방문");

            XLSX.writeFile(wb, `유동인구_분석_${currentStore?.name}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            toast.success("엑셀 다운로드가 완료되었습니다.");
        } catch (error) {
            console.error("엑셀 다운로드 오류:", error);
            toast.error("엑셀 파일 생성에 실패했습니다.");
        }
    };

    const handleGenerateReport = async () => {
        if (!currentStore) return;
        const toastId = toast.loading("주간 심층 리포트를 생성 중입니다...");
        try {
            const currentDate = date?.to || new Date();
            const year = currentDate.getFullYear();
            
            // Calculate ISO week number manually or use generic
            const d = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
            const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);

            const res = await axios.post('/api/v1/reports', {
                storeId: currentStore.id,
                year,
                weekNumber
            });

            if (res.data.htmlSnippet) {
                // For preview without Chromium, open the HTML string in a new window to print
                const newWindow = window.open();
                if (newWindow) {
                    newWindow.document.write(res.data.htmlSnippet);
                    newWindow.document.close();
                    // trigger print dialog after small delay to let styles load
                    setTimeout(() => newWindow.print(), 500);
                }
                toast.success("리포트 생성이 완료되었습니다.", { id: toastId });
            }
        } catch (error: any) {
            toast.error(`리포트 생성 실패: ${error.response?.data?.detail || error.message}`, { id: toastId });
        }
    };

    // Traffic Heatmap Matrix builder
    const renderHeatmap = () => {
        if (!trafficData?.dayHourHeatmap) return null;

        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const hours = Array.from({ length: 24 }, (_, i) => i);

        // Find max to calculate opacity
        const maxVisitors = Math.max(...trafficData.dayHourHeatmap.map((d: any) => d.visitors), 1);

        const matrix: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
        trafficData.dayHourHeatmap.forEach((item: any) => {
            matrix[item.dayIndex][item.hour] = item.visitors;
        });

        return (
            <div className="w-full overflow-x-auto">
                <div className="min-w-[700px] py-4">
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
                                const intensity = val > 0 ? 0.1 + (val / maxVisitors) * 0.9 : 0;
                                return (
                                    <div
                                        key={`${dIdx}-${h}`}
                                        className="flex-1 h-8 mx-0.5 rounded-sm transition-all hover:ring-2 hover:ring-indigo-500 relative group"
                                        style={{ backgroundColor: intensity > 0 ? `rgba(99, 102, 241, ${intensity})` : '#F2F4F6' }}
                                    >
                                        <div className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#191F28] text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 shadow-lg">
                                            {day}요일 {h}시: {val}명 ({((val / (trafficData.totalVisitsForHeatmap || 1)) * 100).toFixed(1)}%)
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

    if (!currentStore) return null;

    const funnelData = trafficData ? [
        { name: '유동인구', fullName: '유동인구 (매장 앞)', value: trafficData.funnel.passBy, rate: 100 },
        { name: '방문', fullName: '매장 방문 (입장)', value: trafficData.funnel.visit, rate: trafficData.funnel.passBy > 0 ? (trafficData.funnel.visit / trafficData.funnel.passBy * 100).toFixed(1) : 0 },
        { name: '결제', fullName: '결제 (실주문)', value: trafficData.funnel.sales, rate: trafficData.funnel.visit > 0 ? (trafficData.funnel.sales / trafficData.funnel.visit * 100).toFixed(1) : 0 }
    ] : [];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 border border-slate-200 shadow-lg rounded-xl min-w-[180px]">
                    <p className="font-extrabold text-slate-800 mb-2">{data.fullName}</p>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-500 text-sm">인원/건수</span>
                        <span className="font-bold text-indigo-600 text-base">{new Intl.NumberFormat('ko-KR').format(data.value)}</span>
                    </div>
                    {data.name !== '유동인구' && (
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-2">
                            <span className="text-slate-500 text-xs text-left">이전 단계 대비<br/>전환율</span>
                            <span className="font-bold text-slate-700">{data.rate}%</span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in zoom-in-95 duration-500 pb-20">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-lg border border-[#F2F4F6] shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#191F28] flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-500" />
                        유동인구 분석
                    </h1>
                    <p className="text-[#8B95A1] text-sm mt-1">
                        CCTV 트래픽 센서를 통해 수집된 잠재 고객 데이터를 다각도로 분석합니다.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <PresetDateRangePicker date={date} setDate={setDate} />

                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing || syncing || loading}
                        className="h-10 px-4 rounded-md border border-[#E5E8EB] bg-white text-[#333D4B] font-medium text-sm flex items-center gap-2 hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-500' : 'text-[#8B95A1]'}`} />
                        조회
                    </button>

                    <button
                        onClick={handleSync}
                        disabled={syncing || refreshing || loading}
                        className="h-10 px-4 rounded-md bg-indigo-600 text-white font-medium text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        데이터 동기화
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={loading || !trafficData}
                        className="h-10 px-4 rounded-md bg-[#F2F4F6] text-[#333D4B] font-medium text-sm flex items-center gap-2 hover:bg-[#E5E8EB] transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        <FileDown className="w-4 h-4 text-[#8B95A1]" />
                        엑셀 다운로드
                    </button>

                    <button
                        onClick={handleGenerateReport}
                        disabled={loading}
                        className="h-10 px-4 rounded-md bg-[#F2F4F6] text-[#333D4B] font-medium text-sm flex items-center gap-2 hover:bg-[#E5E8EB] transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                        <FileText className="w-4 h-4 text-[#8B95A1]" />
                        리포트 생성 (PDF)
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-[60vh] flex flex-col items-center justify-center bg-white rounded-lg border border-[#F2F4F6]">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-[#8B95A1] font-medium">트래픽 데이터를 분석 중입니다...</p>
                </div>
            ) : !trafficData ? (
                <div className="h-[60vh] flex flex-col items-center justify-center bg-white rounded-lg border border-[#F2F4F6]">
                    <Users className="w-12 h-12 text-[#D1D6DB] mb-4" />
                    <p className="text-[#8B95A1] font-medium">데이터가 없습니다.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Funnel Chart Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-[#F2F4F6] p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="text-xl font-bold text-[#191F28]">고객 전환 퍼널 (Funnel Exploration)</h3>
                                <p className="text-sm text-[#8B95A1] mt-1">유동인구에서 매장 방문, 실제 결제까지 이어진 전환 흐름(Drop-off)을 분석합니다.</p>
                            </div>
                        </div>
                        
                        <div className="h-[380px] w-full mt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={funnelData} margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4E5968', fontSize: 14, fontWeight: 700 }} dy={15} />
                                    <YAxis hide={true} domain={[0, 'dataMax']} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                    
                                    {/* GA4 style area connecting the bars */}
                                    <Area type="monotone" dataKey="value" fill="#E8F0FE" stroke="none" activeDot={false} />
                                    
                                    {/* Solid bars for the actual values */}
                                    <Bar dataKey="value" fill="#7B96F5" barSize={80} radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="value" position="top" formatter={(val: any) => new Intl.NumberFormat('ko-KR').format(val)} fill="#333D4B" fontSize={15} fontWeight={800} dy={-10} />
                                    </Bar>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                            <div className="bg-slate-50/70 p-4 rounded-xl text-center">
                                <p className="text-slate-500 text-sm font-medium mb-1">유입 전환율 (유동인구 → 방문)</p>
                                <p className="text-2xl font-extrabold text-[#191F28]">{funnelData.length > 0 ? funnelData[1].rate : 0}%</p>
                            </div>
                            <div className="bg-slate-50/70 p-4 rounded-xl text-center">
                                <p className="text-slate-500 text-sm font-medium mb-1">매출 전환율 (방문 → 결제)</p>
                                <p className="text-2xl font-extrabold text-[#191F28]">{funnelData.length > 0 ? funnelData[2].rate : 0}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Demographic Matrix */}
                    <div className="lg:col-span-2">
                        <DemographicMatrix data={trafficData?.crossAnalysisMatrix || []} />
                    </div>

                    {/* Time Matrix Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-[#F2F4F6] p-6 lg:col-span-2">
                        <div className="flex items-start justify-between mb-6">
                             <div>
                                  <h3 className="text-xl font-bold text-[#191F28] mb-1">요일 및 시간대별 트래픽 분포</h3>
                                  <p className="text-sm text-[#8B95A1]">어느 시간대에 매장 방문이 집중되는지 분석합니다. 색이 진할수록 유동인구 입장이 많음을 의미합니다.</p>
                             </div>
                        </div>
                        {renderHeatmap()}
                    </div>

                    {/* Demographic Matrix Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-[#F2F4F6] p-6">
                        <h3 className="text-xl font-bold text-[#191F28] mb-1">방문객 성별 및 연령대 분포</h3>
                        <p className="text-sm text-[#8B95A1] mb-6">주 매장 방문객의 인구통계학적 특성을 파악합니다.</p>
                        
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trafficData.demoData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F4F6" />
                                    <XAxis dataKey="age" tick={{ fontSize: 12, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip cursor={{ fill: '#F2F4F6' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E8EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend iconType="circle" />
                                    <Bar dataKey="Male" name="남성" stackId="a" fill="#60a5fa" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="Female" name="여성" stackId="a" fill="#f472b6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
