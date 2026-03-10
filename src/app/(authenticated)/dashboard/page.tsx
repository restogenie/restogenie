"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DateTime } from 'luxon';
import { format, subDays } from 'date-fns';
import { useStore } from '@/lib/StoreContext';
import { FileDown, RefreshCw, ShoppingBag, Coins, Store, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DateRange } from "react-day-picker";
import { PresetDateRangePicker } from "@/components/Dashboard/PresetDateRangePicker";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Data Models
interface SaleInfo {
    oid: string;
    provider: string;
    business_date: string;
    created_at: string;
    order_name: string;
    order_from: string;
    order_status: string;
    ordered_amount: number;
    paid_amount: number;
    discount_amount: number;
    delivery_app: string | null;
    customer_uid: string | null;
    customer_mobile: string | null;
}

export default function DashboardPage() {
    const { currentStore } = useStore();
    const [sales, setSales] = useState<SaleInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0, payhereCount: 0, easyposCount: 0, smartroCount: 0 });
    const [chartData, setChartData] = useState<any[]>([]);
    const [pieData, setPieData] = useState<any[]>([]);
    const [connections, setConnections] = useState<any[]>([]);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    // Date Filters
    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date()
    });

    const fetchSales = async (isRefresh = false) => {
        if (!currentStore) return;

        try {
            if (isRefresh) setRefreshing(true);

            // Get JWT token from cookies
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

            const res = await axios.get(`/api/v1/sales?store_id=${currentStore.id}&limit=5000&start_date=${startDateStr}&end_date=${endDateStr}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                const data = res.data.data;
                setSales(data);

                // Compute Stats
                const totalSales = data.reduce((sum: number, item: SaleInfo) => sum + item.paid_amount, 0);
                const totalOrders = data.length;
                const payhereCount = data.filter((item: SaleInfo) => item.provider === 'payhere').length;
                const easyposCount = data.filter((item: SaleInfo) => item.provider === 'easypos').length;
                const smartroCount = data.filter((item: SaleInfo) => item.provider === 'smartro').length;
                setStats({ totalSales, totalOrders, payhereCount, easyposCount, smartroCount });

                // Compute Line Chart Data (Daily Sales)
                const dailyMap: Record<string, any> = {};
                data.forEach((item: SaleInfo) => {
                    const d = item.business_date;
                    if (!dailyMap[d]) dailyMap[d] = { name: d, payhere: 0, easypos: 0, smartro: 0 };
                    if (item.provider === 'payhere') dailyMap[d].payhere += item.paid_amount;
                    if (item.provider === 'easypos') dailyMap[d].easypos += item.paid_amount;
                    if (item.provider === 'smartro') dailyMap[d].smartro += item.paid_amount;
                });
                setChartData(Object.values(dailyMap).sort((a: any, b: any) => a.name.localeCompare(b.name)));

                // Compute Pie Chart Data
                setPieData([
                    { name: 'Payhere', value: data.filter((i: SaleInfo) => i.provider === 'payhere').reduce((s: number, i: SaleInfo) => s + i.paid_amount, 0), color: '#00C471' },
                    { name: 'Easypos', value: data.filter((i: SaleInfo) => i.provider === 'easypos').reduce((s: number, i: SaleInfo) => s + i.paid_amount, 0), color: '#F9A825' },
                    { name: 'Smartro', value: data.filter((i: SaleInfo) => i.provider === 'smartro').reduce((s: number, i: SaleInfo) => s + i.paid_amount, 0), color: '#3182F6' },
                ].filter(p => p.value > 0));

                // Also fetch connection statuses
                const connRes = await axios.get(`/api/v1/business/connection?store_id=${currentStore.id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (connRes.data?.connections) {
                    setConnections(connRes.data.connections);
                }

                // Fetch latest system log to get last sync time
                const logRes = await axios.get(`/api/v1/system/logs?store_id=${currentStore.id}&limit=1`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (logRes.data?.data && logRes.data.data.length > 0) {
                    setLastSyncTime(logRes.data.data[0].created_at);
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch sales', err);
            if (err.response?.status === 401) {
                window.location.href = '/login';
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (currentStore && date?.from && date?.to) {
            fetchSales();
        }
    }, [date, currentStore]);

    const handleManualSync = async () => {
        if (!currentStore) return;
        
        try {
            setSyncing(true);
            const token = document.cookie.split("; ").find((row) => row.startsWith("admin_token="))?.split("=")[1];
            if (!token) return;

            const activeConns = connections.filter((c: any) => c.is_active);
            if (activeConns.length === 0) {
                toast.error("활성화된 연동 정보가 없습니다. 마법사 탭을 확인해주세요.");
                setSyncing(false);
                return;
            }

            let errorCount = 0;
            for (const conn of activeConns) {
                try {
                    await axios.post(`/api/v1/sync/${conn.vendor}`, 
                        { store_id: currentStore.id, days_to_sync: 1 }, 
                        { headers: { "Authorization": `Bearer ${token}` } }
                    );
                } catch (e) {
                    console.error(`Sync error for ${conn.vendor}:`, e);
                    errorCount++;
                }
            }

            if (errorCount > 0) {
                toast.error(`일부 채널 데이터 동기화 과정에서 서버 응답 지연이 있었습니다 (${errorCount}건).`);
            } else {
                toast.success("데이터 동기화가 완료되었습니다.");
            }
            
            // Re-fetch sales/logs to update the UI
            fetchSales(true); 

        } catch (e) {
            console.error("Manual sync failed", e);
            toast.error("데이터 동기화 요청에 실패했습니다.");
        } finally {
            setSyncing(false);
        }
    };

    const downloadExcel = () => {
        if (!sales || sales.length === 0) {
            toast.error("다운로드할 데이터가 없습니다.");
            return;
        }

        try {
            // 1. Prepare data for Excel
            const exportData = sales.map((item) => ({
                "결제일시": formatDate(item.created_at),
                "주문번호(OID)": item.oid,
                "포스사": item.provider === 'payhere' ? '페이히어' : item.provider === 'smartro' ? '스마트로' : '이지포스',
                "주문내역": item.order_name || '-',
                "결제금액": item.paid_amount,
                "주문경로(배달앱)": item.delivery_app || item.order_from || '-',
                "고객식별(Phone/UID)": item.customer_mobile || item.customer_uid || '-'
            }));

            // 2. Create Sheet
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "매출내역");

            // 3. Export
            const startDateStr = date?.from ? format(date.from, 'yyyy-MM-dd') : '';
            const endDateStr = date?.to ? format(date.to, 'yyyy-MM-dd') : '';
            const fileName = `RestoGenie_매출내역_${startDateStr}_${endDateStr}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            toast.success("엑셀 다운로드가 완료되었습니다.");
        } catch (e) {
            toast.error("엑셀 파일 생성 중 오류가 발생했습니다.");
            console.error(e);
        }
    };

    const formatDate = (isoStr: string) => {
        if (!isoStr) return '-';
        return DateTime.fromISO(isoStr).toFormat('yyyy.MM.dd HH:mm');
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('ko-KR').format(val);
    };

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#191F28] mb-2">통합 매출 대시보드</h1>
                    <p className="text-[#8B95A1] font-medium">연동된 결제 채널의 실시간 매출 내역을 확인하세요.</p>
                </div>
                <div className="flex flex-col xl:flex-row xl:items-center gap-3 w-full xl:w-auto">
                    <PresetDateRangePicker date={date} setDate={setDate} />

                    <div className="flex flex-col items-end gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => fetchSales(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E8EB] text-[#4E5968] rounded-xl font-semibold hover:bg-[#F2F4F6] transition-colors shadow-sm whitespace-nowrap"
                            >
                                <Search className={cn("w-4 h-4", refreshing && "animate-pulse text-[#3182F6]")} />
                                조회
                            </button>
                            <button
                                disabled={syncing}
                                onClick={handleManualSync}
                                className="flex items-center gap-2 px-4 py-2 bg-[#F2F4F6] border border-[#E5E8EB] text-[#191F28] rounded-xl font-semibold hover:bg-[#E5E8EB] transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
                            >
                                <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin text-[#3182F6]")} />
                                {syncing ? "동기화 중..." : "동기화"}
                            </button>
                            <button
                                onClick={downloadExcel}
                                className="flex justify-center items-center gap-2 px-4 py-2 bg-[#3182F6] text-white rounded-xl font-semibold hover:bg-[#1B64DA] transition-colors shadow-sm whitespace-nowrap"
                            >
                                <FileDown className="w-4 h-4" />
                                엑셀 다운로드
                            </button>
                        </div>
                        {lastSyncTime && (
                            <span className="text-[11px] text-[#8B95A1] font-medium px-1 w-full text-right">
                                최근 동기화: {formatDate(lastSyncTime)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Sync Status Banners */}
            {connections.filter(c => c.sync_status === 'SYNCING').length > 0 && (
                <div className="flex flex-col gap-2">
                    {connections.filter(c => c.sync_status === 'SYNCING').map((conn, idx) => (
                        <div key={idx} className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                <span className="font-semibold text-sm">
                                    {conn.vendor === 'baemin' ? '배달의민족' : conn.vendor === 'coupangeats' ? '쿠팡이츠' : '요기요'} 연동 중입니다...
                                </span>
                            </div>
                            <span className="text-xs font-medium bg-blue-100 px-2 py-1 rounded text-blue-700">백그라운드 처리중</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="총 매출액"
                    value={`₩ ${formatCurrency(stats.totalSales)}`}
                    subtitle="전체 연동된 결제 합계"
                    icon={<Coins className="w-6 h-6 text-[#3182F6]" />}
                />
                <StatCard
                    title="총 주문건수"
                    value={formatCurrency(stats.totalOrders)}
                    subtitle="정상 결제 기준"
                    icon={<ShoppingBag className="w-6 h-6 text-[#3182F6]" />}
                />
                <StatCard
                    title="채널별 결제 (페이히어)"
                    value={formatCurrency(stats.payhereCount)}
                    subtitle="Payhere 연동 건수"
                    icon={<Store className="w-6 h-6 text-[#00C471]" />}
                />
                <StatCard
                    title="채널별 결제 (이지포스)"
                    value={formatCurrency(stats.easyposCount)}
                    subtitle="Easypos 연동 건수"
                    icon={<Store className="w-6 h-6 text-[#F9A825]" />}
                />
                <StatCard
                    title="채널별 결제 (스마트로)"
                    value={formatCurrency(stats.smartroCount)}
                    subtitle="Smartro 연동 건수"
                    icon={<Store className="w-6 h-6 text-[#3182F6]" />}
                />
            </div>

            {/* Charts Section */}
            {!loading && sales.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Line Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-6">
                        <h3 className="text-lg font-bold text-[#191F28] mb-6">일별 매출 추이</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F4F6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8B95A1' }} dy={10} />
                                    <YAxis tickFormatter={(v) => `₩${(v / 10000).toFixed(0)}만`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8B95A1' }} dx={-10} />
                                    <RechartsTooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value: any) => [`₩${formatCurrency(value)}`, '']} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                                    <Line type="monotone" dataKey="payhere" name="페이히어" stroke="#00C471" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="easypos" name="이지포스" stroke="#F9A825" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="smartro" name="스마트로" stroke="#3182F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-6">
                        <h3 className="text-lg font-bold text-[#191F28] mb-6">포스사 매출 점유율</h3>
                        <div className="h-[300px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: any) => [`₩${formatCurrency(value)}`, '매출액']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                <span className="text-[#8B95A1] text-xs font-semibold">총 매출액</span>
                                <span className="text-[#191F28] font-bold text-lg">₩{(stats.totalSales / 10000).toFixed(0)}만</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-2">
                            {pieData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                    <span className="text-xs font-medium text-[#4E5968]">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#F2F4F6]">
                    <h3 className="text-lg font-bold text-[#191F28]">최근 주문 내역</h3>
                </div>

                {loading ? (
                    <div className="px-6 py-12 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3182F6]"></div>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="px-6 py-16 text-center text-[#8B95A1]">
                        <p className="mb-2">연동된 데이터가 없습니다.</p>
                        <p className="text-sm">마법사(Wizard) 탭에서 데이터 동기화를 먼저 진행해주세요.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full min-w-[800px] text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-[#F9FAFB] border-b border-[#F2F4F6]">
                                    <th className="px-6 py-4 text-sm font-semibold text-[#4E5968]">시간</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-[#4E5968]">주문번호</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-[#4E5968]">제공자</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-[#4E5968]">주문내역</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-[#4E5968]">결제금액</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-[#4E5968]">주문경로</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-[#4E5968]">고객</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F2F4F6]">
                                {sales.map((item, idx) => (
                                    <tr key={item.oid || idx} className="hover:bg-[#F9FAFB] transition-colors">
                                        <td className="px-6 py-4 text-sm text-[#4E5968]">{formatDate(item.created_at)}</td>
                                        <td className="px-6 py-4 text-sm text-[#8B95A1] font-mono">
                                            {item.oid.substring(0, 15)}...
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.provider === 'payhere' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#E8F8EE] text-[#00C471]">
                                                    Payhere
                                                </span>
                                            ) : item.provider === 'easypos' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF4E5] text-[#F9A825]">
                                                    Easypos
                                                </span>
                                            ) : item.provider === 'smartro' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                                                    Smartro
                                                </span>
                                            ) : item.provider === 'baemin' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#2AC1BC]/10 text-[#2AC1BC]">
                                                    배민
                                                </span>
                                            ) : item.provider === 'coupangeats' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                                                    쿠팡이츠
                                                </span>
                                            ) : item.provider === 'yogiyo' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FA0050]/10 text-[#FA0050]">
                                                    요기요
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    {item.provider}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-[#191F28] max-w-[200px] truncate">
                                            {item.order_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-[#191F28]">
                                            {formatCurrency(item.paid_amount)}원
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[#4E5968]">
                                            {item.delivery_app || item.order_from || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[#8B95A1]">
                                            {item.customer_mobile || item.customer_uid || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, subtitle, icon }: { title: string, value: string, subtitle: string, icon: React.ReactNode }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-[#F2F4F6] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#4E5968] font-semibold text-sm">{title}</h3>
                <div className="p-2 bg-[#F2F4F6] rounded-xl">{icon}</div>
            </div>
            <div>
                <div className="text-2xl font-bold text-[#191F28] mb-1">{value}</div>
                <div className="text-xs text-[#8B95A1] font-medium">{subtitle}</div>
            </div>
        </div>
    );
}
