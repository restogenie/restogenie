"use client";

import React, { useState, useEffect } from 'react';
import { 
  Download, FileText, Pin, Utensils, 
  BrainCircuit, TrendingUp, MapPin, 
  BarChart3, ListOrdered, BarChart2, Loader2, AlertCircle
} from 'lucide-react';
import { PresetDateRangePicker } from "@/components/Dashboard/PresetDateRangePicker";
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { useStore } from "@/lib/StoreContext";
import axios from 'axios';

export default function WeeklyReportDashboard() {
  const { currentStore } = useStore();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: subDays(new Date(), 1)
  });

  const [menuTab, setMenuTab] = useState('overall');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentStore?.id && date?.from && date?.to) {
      setIsLoading(true);
      setError(null);
      
      const startParam = format(date.from, 'yyyy-MM-dd');
      const endParam = format(date.to, 'yyyy-MM-dd');
      
      axios.get(`/api/v1/analytics/report`, { 
        params: { store_id: currentStore.id, start_date: startParam, end_date: endParam } 
      })
      .then(res => {
        if (res.data.status === "success") {
            setReportData(res.data);
        } else {
            setError("데이터를 불러오는데 실패했습니다.");
        }
      })
      .catch(err => {
        console.error(err);
        setError("서버 통신 중 에러가 발생했습니다.");
      })
      .finally(() => setIsLoading(false));
    }
  }, [currentStore, date]);

  if (!currentStore) return null;

  return (
    <div className="bg-slate-50 text-slate-800 font-sans pb-12 rounded-xl mt-4">
      {/* Header Area */}
      <header className="bg-white border-b border-slate-200 z-10 shadow-sm rounded-t-xl relative">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-900 p-2.5 rounded-xl shadow-sm">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">심층 진단 리포트</h1>
              <div className="flex items-center space-x-2 text-sm font-medium text-slate-500 mt-1">
                <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
                  {date?.from && date?.to ? `${format(date.from, 'yyyy-MM-dd')} ~ ${format(date.to, 'yyyy-MM-dd')}` : '기간 선택'}
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600 font-bold">{currentStore.name}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200 shadow-inner">
             <PresetDateRangePicker date={date} setDate={setDate} className="w-[300px]" />
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 mt-8 space-y-8 min-h-[500px]">

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-500 font-bold text-lg">실시간 데이터를 분석하여 레포트를 생성 중입니다...</p>
                <p className="text-slate-400 text-sm mt-2">직전 동기간 및 최신 4주 평균 데이터를 비교 연산합니다.</p>
            </div>
        ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-red-200 shadow-sm bg-red-50">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-red-700 font-bold text-lg">{error}</p>
            </div>
        ) : reportData && (
            <div className="animate-in fade-in duration-500 space-y-8">
                {/* 1. Review Scope & Summary */}
                <section className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-200 p-4 flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-slate-500" />
                        <h2 className="text-xl font-bold text-slate-800">분석 범위 및 비교 기준</h2>
                    </div>
                    <div className="p-6">
                        <ul className="list-disc pl-6 space-y-2 text-md text-slate-700 font-medium whitespace-break-spaces">
                        <li>이 리포트는 선택하신 기간 <strong>({reportData.period.days}일)</strong>의 데이터를 기준으로 작성되었습니다.</li>
                        <li>명확한 실적 진단을 위해 <strong>"직전 동기간 ({reportData.period.days}일)"</strong> 및 <strong>"최근 4회차 평균"</strong> 데이터와 3면 비교를 수행했습니다.</li>
                        <li>매장별 트래픽 전환률, 채널 비중 변동, 메뉴 선호도 및 객단가의 변화를 모두 추적합니다.</li>
                        </ul>
                    </div>
                    </div>

                    <div className="bg-blue-50/70 rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
                    <div className="p-6 md:p-8">
                        <div className="flex items-center space-x-3 mb-6">
                        <Pin className="w-7 h-7 text-indigo-600 fill-indigo-100 transform -rotate-45" />
                        <h2 className="text-2xl font-extrabold text-slate-900">핵심 실적 브리핑</h2>
                        </div>
                        <ul className="space-y-4 text-lg text-slate-800 font-medium">
                        <li className="flex items-center">
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full mr-3 flex-shrink-0"></span> 
                            선택 기간 총 주문금액: <strong className="ml-2 text-xl">{reportData.keyMetricsData[0].asIs}원</strong>
                        </li>
                        <li className="flex items-center">
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full mr-3 flex-shrink-0"></span> 
                            직전 동기간 대비: 
                            <strong className={`ml-2 text-xl ${parseFloat(reportData.keyMetricsData[0].growth) > 0 ? 'text-blue-600' : parseFloat(reportData.keyMetricsData[0].growth) < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                {parseFloat(reportData.keyMetricsData[0].growth) > 0 ? '+' : ''}{reportData.keyMetricsData[0].growth}%
                            </strong>
                        </li>
                        <li className="flex items-start mt-4 pt-4 border-t border-blue-100/50">
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full mr-3 mt-2 flex-shrink-0"></span> 
                            <span className="leading-relaxed">
                            <strong>AI 통합 진단:</strong> 
                            <span className="ml-1 text-slate-700">{reportData.aiInsight}</span>
                            </span>
                        </li>
                        </ul>
                    </div>
                    </div>
                </section>

                {/* 2. Key Metrics Table */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between bg-slate-50/50 gap-4">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="w-6 h-6 text-indigo-600" />
                            <h2 className="text-xl font-bold text-slate-800">핵심 지표 상세 비교</h2>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                            <th className="px-5 py-3 text-left font-extrabold text-slate-600">지표명</th>
                            <th className="px-5 py-3 text-right font-extrabold text-indigo-700 bg-indigo-50/50">이번 기간 (AS-IS)</th>
                            <th className="px-5 py-3 text-right font-extrabold text-slate-500">직전 동기간</th>
                            <th className="px-5 py-3 text-right font-extrabold text-slate-600">직전 대비 증감률</th>
                            <th className="px-5 py-3 text-right font-extrabold text-slate-500">최근 4회차 평균</th>
                            <th className="px-5 py-3 text-right font-extrabold text-slate-600">평균 대비 (Gap)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {reportData.keyMetricsData.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-3 font-bold text-slate-800">{row.metric}</td>
                                <td className="px-5 py-3 text-right font-bold text-slate-900 bg-indigo-50/30">{row.asIs}</td>
                                <td className="px-5 py-3 text-right text-slate-500 font-medium">{row.prev}</td>
                                <td className={`px-5 py-3 text-right font-bold ${parseFloat(row.growth) > 0 ? 'text-blue-600' : parseFloat(row.growth) < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                    {parseFloat(row.growth) > 0 ? '+' : ''}{row.growth}%
                                </td>
                                <td className="px-5 py-3 text-right text-slate-500">{row.avg}</td>
                                <td className={`px-5 py-3 text-right font-bold ${parseFloat(row.gap) > 0 ? 'text-blue-600' : parseFloat(row.gap) < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                    {parseFloat(row.gap) > 0 ? '+' : ''}{row.gap}%
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                </section>

                {/* 3. Daily Sales Chart / Table */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 flex items-center space-x-2 bg-slate-50/50">
                        <BarChart2 className="w-6 h-6 text-indigo-600" />
                        <h2 className="text-xl font-bold text-slate-800">일자별 매출 트렌드</h2>
                    </div>
                    
                    <div className="p-6">
                        <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-200">
                            <div className="flex items-center mb-3">
                                <BrainCircuit className="w-5 h-5 text-indigo-600 mr-2" />
                                <span className="font-extrabold text-slate-900 text-lg">AI 변동성 진단</span>
                            </div>
                            <p className="text-slate-700 font-medium leading-relaxed">선택하신 기간 동안의 일자별 홀/배달 매출 비중 및 추이입니다. 특이하게 매출이 급락/급등한 요인은 외부 요인(날씨, 이벤트)과 교차 분석할 필요가 있습니다.</p>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
                                <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3 text-center font-bold text-slate-600">분석 일자</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">총 주문금액</th>
                                    <th className="px-4 py-3 text-right font-bold text-slate-600">결제 건수</th>
                                    <th className="px-4 py-3 text-right font-bold text-blue-600">홀 매출</th>
                                    <th className="px-4 py-3 text-right font-bold text-orange-600">배달 매출</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                {reportData.dailySalesData.map((row: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-center font-bold text-slate-700">{row.date}</td>
                                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">{new Intl.NumberFormat('ko-KR').format(row.sales)}원</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-500">{row.customers}건</td>
                                    <td className="px-4 py-3 text-right font-bold text-blue-700">{new Intl.NumberFormat('ko-KR').format(row.hallSales)}원</td>
                                    <td className="px-4 py-3 text-right font-bold text-orange-700">{new Intl.NumberFormat('ko-KR').format(row.deliverySales)}원</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* 4. Menu Analysis */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between bg-slate-50/50 gap-4">
                    <div className="flex items-center space-x-2">
                    <Utensils className="w-6 h-6 text-green-600" />
                    <h2 className="text-xl font-bold text-slate-800">심층 메뉴/카테고리 분석</h2>
                    </div>
                    
                    <div className="flex bg-slate-200 p-1 rounded-lg overflow-x-auto">
                    <button 
                        onClick={() => setMenuTab('overall')}
                        className={`px-4 py-1.5 text-sm font-bold whitespace-nowrap rounded-md transition-colors ${menuTab === 'overall' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BarChart3 className="w-4 h-4 inline mr-1.5 mb-0.5" /> 기간 내 매출 비중
                    </button>
                    </div>
                </div>
                
                <div className="p-5">
                    {menuTab === 'overall' && (
                    <div className="animate-in fade-in">
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
                            <thead className="bg-slate-100">
                            <tr>
                                <th className="px-5 py-3 text-left font-bold text-slate-600">카테고리</th>
                                <th className="px-5 py-3 text-right font-bold text-slate-600">판매 수량</th>
                                <th className="px-5 py-3 text-right font-bold text-slate-600">카테고리 전체 매출</th>
                                <th className="px-5 py-3 text-right font-bold text-indigo-700">매출 기여도 비중</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {reportData.menuOverallData.map((row: any, idx: number) => (
                                <tr key={idx} className={idx < 3 ? 'bg-indigo-50/20 hover:bg-indigo-50/40' : 'hover:bg-slate-50'}>
                                <td className="px-5 py-3 font-bold text-slate-800">
                                    {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}{row.category}
                                </td>
                                <td className="px-5 py-3 text-right text-slate-600 font-medium">{row.quantity}개</td>
                                <td className="px-5 py-3 text-right font-bold text-slate-700">{row.sales}원</td>
                                <td className="px-5 py-3 text-right font-extrabold text-indigo-600">{row.ratio}%</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                    )}
                </div>
                </section>
            </div>
        )}
      </main>
    </div>
  );
}
