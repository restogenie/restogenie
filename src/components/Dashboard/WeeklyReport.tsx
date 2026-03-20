import React, { useState } from 'react';
import { 
  Download, Calendar, FileText, Pin, Activity, Users, ShoppingBag, Utensils, 
  BrainCircuit, AlertTriangle, Store, TrendingUp, Info, MapPin, Briefcase, 
  BarChart3, ListOrdered, Package, BarChart2 
} from 'lucide-react';

export default function WeeklyReportDashboard() {
  const [selectedRegion, setSelectedRegion] = useState('전체 지역');
  const [selectedTeam, setSelectedTeam] = useState('전체 팀');
  const [selectedStore, setSelectedStore] = useState('전사'); 
  const [menuTab, setMenuTab] = useState('overall'); 
  const [comparisonPeriod, setComparisonPeriod] = useState('전주');
  const [reviewScope, setReviewScope] = useState('주간');

  const keyMetricsData = [
    { store: '전사', metric: '총 주문금액', target: '63,000,000', asIs: '33,933,950', toBe: '32,422,270', gap: '-1,511,680', achivement: '51.46%', growth: '-4.45%' },
    { store: '강남점', metric: '총 주문금액', target: '21,000,000', asIs: '13,594,600', toBe: '12,694,000', gap: '-900,600', achivement: '60.45%', growth: '-6.62%' },
    { store: '강남점', metric: '매출이익률(%)', target: '70%', asIs: '67.11%', toBe: '68.85%', gap: '+1.75%p', achivement: '98.36%', growth: '+2.60%' },
    { store: '강남점', metric: '공헌이익률(%)', target: '40%', asIs: '52.76%', toBe: '38.36%', gap: '-14.40%p', achivement: '95.90%', growth: '-27.30%' },
    { store: '강남점', metric: '홀매출 비중(%)', target: '50%', asIs: '62.12%', toBe: '59.47%', gap: '-2.65%p', achivement: '118.95%', growth: '-4.26%' },
    { store: '강남점', metric: '홀 객단가', target: '13,000', asIs: '9,912', toBe: '10,013', gap: '+101', achivement: '77.02%', growth: '+1.02%' },
    { store: '강남점', metric: '배달 객단가', target: '17,000', asIs: '19,001', toBe: '18,505', gap: '-497', achivement: '108.85%', growth: '-2.61%' },
    { store: '강남점', metric: '신규가입률(%)', target: '30%', asIs: '27.02%', toBe: '27.43%', gap: '+0.41%p', achivement: '91.44%', growth: '+1.51%' },
    { store: '강남점', metric: '4주 재방문율(%)', target: '50%', asIs: '40.64%', toBe: '37.20%', gap: '-3.44%p', achivement: '74.40%', growth: '-8.46%' },
    { store: '강남점', metric: '방문전환율(%)', target: '5%', asIs: '4.04%', toBe: '4.24%', gap: '+0.20%p', achivement: '84.80%', growth: '+4.89%' },
    { store: '강남점', metric: '주문서전환율(%)', target: '50%', asIs: '58.92%', toBe: '60.13%', gap: '+1.21%p', achivement: '120.26%', growth: '+2.05%' },
    { store: '대학로점', metric: '총 주문금액', target: '25,666,667', asIs: '15,451,180', toBe: '14,404,610', gap: '-1,046,570', achivement: '56.12%', growth: '-6.77%' },
    { store: '대학로점', metric: '매출이익률(%)', target: '70%', asIs: '69.73%', toBe: '69.55%', gap: '-0.18%p', achivement: '99.36%', growth: '-0.25%' },
    { store: '대학로점', metric: '전주 공헌이익률(%)', target: '40%', asIs: '46.11%', toBe: '31.98%', gap: '-14.13%p', achivement: '79.95%', growth: '-30.64%' },
    { store: '대학로점', metric: '홀매출 비중(%)', target: '50%', asIs: '66.11%', toBe: '53.66%', gap: '-12.45%p', achivement: '107.33%', growth: '-18.83%' },
    { store: '대학로점', metric: '홀 객단가', target: '13,000', asIs: '11,079', toBe: '10,842', gap: '-237', achivement: '83.40%', growth: '-2.14%' },
    { store: '대학로점', metric: '배달 객단가', target: '17,000', asIs: '17,056', toBe: '17,336', gap: '+280', achivement: '101.98%', growth: '+1.64%' },
    { store: '대학로점', metric: 'NPS', target: '70%', asIs: '20.69%', toBe: '75.00%', gap: '+54.31%p', achivement: '107.14%', growth: '+262.50%' },
    { store: '대학로점', metric: '신규가입률(%)', target: '30%', asIs: '27.11%', toBe: '22.46%', gap: '-4.66%p', achivement: '74.85%', growth: '-17.18%' },
    { store: '대학로점', metric: '4주 재방문율(%)', target: '50%', asIs: '30.95%', toBe: '34.33%', gap: '+3.38%p', achivement: '68.67%', growth: '+10.93%' },
    { store: '대학로점', metric: '방문전환율(%)', target: '5%', asIs: '1.60%', toBe: '1.64%', gap: '+0.04%p', achivement: '32.80%', growth: '+2.50%' },
    { store: '대학로점', metric: '주문서전환율(%)', target: '50%', asIs: '54.88%', toBe: '55.18%', gap: '+0.30%p', achivement: '110.36%', growth: '+0.55%' },
  ];

  const menuOverallData = [
    { category: '더 버거 시리즈', w10: '33.81%', w9: '38.41%', gap: '-4.60%p' },
    { category: '로스트 시리즈', w10: '20.43%', w9: '28.23%', gap: '-7.80%p' },
    { category: 'SLAM 시리즈', w10: '17.81%', w9: '13.92%', gap: '+3.89%p' },
    { category: '엔트리 시리즈', w10: '11.66%', w9: '8.14%', gap: '+3.52%p' },
    { category: '더블 시리즈', w10: '4.42%', w9: '4.64%', gap: '-0.22%p' },
  ];

  const menuRankingData = [
    { category: '더 버거 시리즈', rank1: '강남점 (38.2%)', rank2: '여의도점 (36.5%)', rank3: '마곡점 (34.1%)' },
    { category: '로스트 시리즈', rank1: '대학로점 (25.1%)', rank2: '성수점 (22.8%)', rank3: '홍대점 (21.4%)' },
    { category: 'SLAM 시리즈', rank1: '판교점 (24.5%)', rank2: '가산점 (20.1%)', rank3: '강남점 (18.2%)' },
    { category: '엔트리 시리즈', rank1: '수원역점 (18.6%)', rank2: '신림점 (16.4%)', rank3: '대학로점 (14.2%)' },
    { category: '더블 시리즈', rank1: '여의도점 (8.5%)', rank2: '종로점 (7.2%)', rank3: '강남점 (6.8%)' },
  ];

  const menuRegionalData = [
    { category: '더 버거 시리즈', seoul: '35.4%', gyeonggi: '31.2%', gangwon: '28.1%', chungcheong: '30.5%', jeolla: '29.4%', gyeongsang: '33.2%', jeju: '36.1%' },
    { category: '로스트 시리즈', seoul: '21.0%', gyeonggi: '24.5%', gangwon: '26.2%', chungcheong: '23.1%', jeolla: '25.0%', gyeongsang: '22.8%', jeju: '20.5%' },
    { category: 'SLAM 시리즈', seoul: '16.5%', gyeonggi: '21.1%', gangwon: '22.5%', chungcheong: '20.4%', jeolla: '19.8%', gyeongsang: '18.5%', jeju: '15.8%' },
    { category: '엔트리 시리즈', seoul: '9.8%', gyeonggi: '15.4%', gangwon: '16.8%', chungcheong: '14.2%', jeolla: '15.5%', gyeongsang: '13.1%', jeju: '11.2%' },
    { category: '더블 시리즈', seoul: '5.2%', gyeonggi: '3.5%', gangwon: '2.4%', chungcheong: '4.1%', jeolla: '3.8%', gyeongsang: '4.5%', jeju: '6.5%' },
  ];

  const ingredientCostData: any = {
    '전사': {
      totalRatio: '32.0%',
      gap: '+1.8%p',
      insight: '소스, 채소(양상추 등)의 시장가 급등으로 전사 원가율이 +1.8%p 상승했습니다. 통합 식자재 몰(오늘얼마 등)을 통한 B2B 단가 재협상 및 프로모션 축소가 시급합니다.',
      items: [
        { name: '육류(패티류)', cost: '₩4,539,000', ratio: '14.0%', prevRatio: '14.3%', gap: '-0.3%p', status: '정상', color: 'bg-green-100 text-green-700' },
        { name: '제빵류', cost: '₩1,945,000', ratio: '6.0%', prevRatio: '5.2%', gap: '+0.8%p', status: '주의', color: 'bg-orange-100 text-orange-700' },
        { name: '채소류', cost: '₩1,621,000', ratio: '5.0%', prevRatio: '3.0%', gap: '+2.0%p', status: '위험', color: 'bg-red-100 text-red-700' },
        { name: '공산품', cost: '₩2,269,000', ratio: '7.0%', prevRatio: '7.3%', gap: '-0.3%p', status: '정상', color: 'bg-green-100 text-green-700' },
      ]
    },
    '강남점': {
      totalRatio: '33.5%',
      gap: '+2.1%p',
      insight: '홀 매출 비중이 높은 강남점 특성상, 신선 채소류 단가 인상의 타격을 가장 크게 받았습니다. 세트 메뉴의 감자튀김 비중을 높여 원가를 임시 방어하세요.',
      items: [
        { name: '육류(패티류)', cost: '₩1,853,000', ratio: '14.6%', prevRatio: '14.5%', gap: '+0.1%p', status: '정상', color: 'bg-green-100 text-green-700' },
        { name: '제빵류', cost: '₩837,000', ratio: '6.6%', prevRatio: '5.8%', gap: '+0.8%p', status: '주의', color: 'bg-orange-100 text-orange-700' },
        { name: '채소류', cost: '₩710,000', ratio: '5.6%', prevRatio: '3.1%', gap: '+2.5%p', status: '위험', color: 'bg-red-100 text-red-700' },
        { name: '공산품', cost: '₩850,000', ratio: '6.7%', prevRatio: '7.0%', gap: '-0.3%p', status: '정상', color: 'bg-green-100 text-green-700' },
      ]
    },
    '대학로점': {
      totalRatio: '30.8%',
      gap: '+1.5%p',
      insight: '배달 비중 급증으로 포장재 원가율이 소폭 상승했습니다. 채소류 단가 상승분은 리뷰 이벤트를 통한 사이드(치즈스틱) 유도로 일부 상쇄 중입니다.',
      items: [
        { name: '육류(패티류)', cost: '₩1,930,000', ratio: '13.4%', prevRatio: '13.8%', gap: '-0.4%p', status: '정상', color: 'bg-green-100 text-green-700' },
        { name: '제빵류', cost: '₩777,000', ratio: '5.4%', prevRatio: '5.0%', gap: '+0.4%p', status: '정상', color: 'bg-green-100 text-green-700' },
        { name: '채소류', cost: '₩662,000', ratio: '4.6%', prevRatio: '3.0%', gap: '+1.6%p', status: '주의', color: 'bg-orange-100 text-orange-700' },
        { name: '공산품', cost: '₩1,065,000', ratio: '7.4%', prevRatio: '6.8%', gap: '+0.6%p', status: '주의', color: 'bg-orange-100 text-orange-700' },
      ]
    }
  };

  const dailySalesData: any = {
    '전사': {
      insight: '주말(토, 일) 우천의 영향으로 전사 기준 주말 홀 매출이 비교 기간 대비 크게 감소했습니다. 반면 수요일 배달 프로모션이 일부 효과를 거두며 평일 매출 하락폭을 방어했습니다.',
      data: [
        { day: '월', current: 4200000, prev: 4100000, gap: '+2.4%' },
        { day: '화', current: 4350000, prev: 4400000, gap: '-1.1%' },
        { day: '수', current: 5100000, prev: 4500000, gap: '+13.3%' }, 
        { day: '목', current: 4400000, prev: 4350000, gap: '+1.1%' },
        { day: '금', current: 5800000, prev: 5900000, gap: '-1.7%' },
        { day: '토', current: 4800000, prev: 5800000, gap: '-17.2%' }, 
        { day: '일', current: 3772270, prev: 4883950, gap: '-22.7%' }, 
      ]
    },
    '강남점': {
      insight: '오피스 상권 특성상 평일(월~금) 매출 비중이 높습니다. 금주 수요일 배달 매출이 급증(+17.9%)하며 주중 하락을 방어했으나, 주말 유동인구 급감 타격이 있었습니다.',
      data: [
        { day: '월', current: 1800000, prev: 1850000, gap: '-2.7%' },
        { day: '화', current: 1950000, prev: 2000000, gap: '-2.5%' },
        { day: '수', current: 2300000, prev: 1950000, gap: '+17.9%' },
        { day: '목', current: 1850000, prev: 1900000, gap: '-2.6%' },
        { day: '금', current: 2400000, prev: 2500000, gap: '-4.0%' },
        { day: '토', current: 1300000, prev: 1850000, gap: '-29.7%' },
        { day: '일', current: 1094000, prev: 1544600, gap: '-29.1%' },
      ]
    },
    '대학로점': {
      insight: '전형적인 대학가 상권으로 주말 의존도가 높으나, 주말 우천으로 인한 유동인구 급감(-24.9%)의 타격을 직접적으로 받았습니다.',
      data: [
        { day: '월', current: 2000000, prev: 1900000, gap: '+5.2%' },
        { day: '화', current: 1950000, prev: 1900000, gap: '+2.6%' },
        { day: '수', current: 2100000, prev: 2000000, gap: '+5.0%' },
        { day: '목', current: 2000000, prev: 1950000, gap: '+2.5%' },
        { day: '금', current: 2500000, prev: 2600000, gap: '-3.8%' },
        { day: '토', current: 2100000, prev: 3000000, gap: '-30.0%' },
        { day: '일', current: 1754610, prev: 2101180, gap: '-16.4%' },
      ]
    }
  };

  const activeCostData = ingredientCostData[selectedStore] || ingredientCostData['전사'];
  const activeDailyData = dailySalesData[selectedStore] || dailySalesData['전사'];
  const maxDailySales = Math.max(...activeDailyData.data.map((d: any) => Math.max(d.current, d.prev)));

  const filteredMetrics = keyMetricsData.filter(m => {
    if (selectedStore !== '전사') return m.store === selectedStore || m.store === '전사';
    return true; 
  });

  return (
    <div className="bg-slate-50 text-slate-800 font-sans pb-12 rounded-xl mt-4">
      <header className="bg-white border-b border-slate-200 z-10 shadow-sm rounded-t-xl">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-900 p-2 rounded-xl shadow-sm">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">2026 W10 주간 심층 리포트</h1>
              <div className="flex items-center space-x-2 text-sm font-medium text-slate-500 mt-1">
                <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">2026 W10</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600 font-bold">{selectedRegion}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-600 font-bold">{selectedTeam}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button onClick={() => alert("리포트 다운로드")} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm">
              <Download className="w-4 h-4 mr-2" />
              다운로드
            </button>
          </div>
        </div>

        <div className="bg-slate-50 border-b border-slate-200 py-3 rounded-b-xl overflow-x-auto">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-4 min-w-max">
            <div className="flex items-center text-slate-600 font-bold">
              <span className="mr-3 text-sm uppercase tracking-wider text-slate-400">Filters</span>
            </div>
            
            <div className="flex items-center bg-white rounded-lg p-1 border border-slate-300 shadow-sm">
              <MapPin className="w-4 h-4 text-slate-400 ml-2" />
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 border-none outline-none py-1 px-2 cursor-pointer"
              >
                <option value="전체 지역">전체 지역</option>
                <option value="서울권">서울권</option>
                <option value="경기/인천권">경기/인천권</option>
              </select>
            </div>

            <div className="flex items-center bg-white rounded-lg p-1 border border-slate-300 shadow-sm">
              <Briefcase className="w-4 h-4 text-slate-400 ml-2" />
              <select 
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 border-none outline-none py-1 px-2 cursor-pointer"
              >
                <option value="전체 팀">전체 팀</option>
                <option value="직영팀">직영팀 (HQ)</option>
                <option value="가맹1팀">가맹영업 1팀</option>
              </select>
            </div>

            <div className="flex items-center bg-blue-50 rounded-lg p-1 border border-blue-200 shadow-sm">
              <Store className="w-4 h-4 text-blue-600 ml-2" />
              <select 
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-transparent text-sm font-bold text-blue-800 border-none outline-none py-1 px-2 cursor-pointer"
              >
                <option value="전사">🏢 대상 매장 전체 (ALL)</option>
                <option value="강남점">📍 강남점 (직영/서울)</option>
                <option value="대학로점">📍 대학로점 (가맹1/서울)</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 mt-8 space-y-8">

        {selectedStore === '전사' && (
          <section className="space-y-6">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <h2 className="text-xl font-bold text-slate-800">리뷰 범위</h2>
                </div>
                <div className="flex bg-slate-200 p-1 rounded-lg">
                  {['주간', '월간', '전년대비'].map((scope) => (
                    <button 
                      key={scope}
                      onClick={() => setReviewScope(scope)}
                      className={`px-4 py-1 text-sm font-bold rounded-md transition-colors ${reviewScope === scope ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6">
                <ul className="list-disc pl-6 space-y-2 text-md text-slate-700 font-medium whitespace-break-spaces">
                  <li>이번 문서는 <strong>2026 W10 실적을 W9(전주)와 비교해</strong>, 변동 요인을 점검합니다.</li>
                  <li>매장별 <strong>구조, 전환 지표, 사이드 믹스 시너지스틱 변화</strong>를 함께 확인합니다.</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50/50 rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Pin className="w-7 h-7 text-red-500 fill-red-100 transform -rotate-45" />
                  <h2 className="text-2xl font-extrabold text-slate-900">핵심 요약 (W10 vs W9)</h2>
                </div>
                <ul className="space-y-3 text-lg text-slate-800 font-medium">
                  <li className="flex items-center"><span className="w-2 h-2 bg-slate-400 rounded-full mr-3 flex-shrink-0"></span> 전사 총 주문금액: <strong>32,422,270원</strong></li>
                  <li className="flex items-center"><span className="w-2 h-2 bg-slate-400 rounded-full mr-3 flex-shrink-0"></span> 전주 대비: <strong className="text-red-600 ml-1">-1,511,680원 (-4.45%)</strong></li>
                  <li className="flex items-start mt-2">
                    <span className="w-2 h-2 bg-slate-400 rounded-full mr-3 mt-2.5 flex-shrink-0"></span> 
                    <span className="leading-relaxed">
                      결론: 동반 역성장이며, 대학로는 <strong className="text-slate-900">홀 급감 + 배달 확대</strong>로 구조가 급변했습니다.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between bg-slate-50/50 gap-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-800">{comparisonPeriod} 대비 주요 지표 비교</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left font-extrabold text-slate-600">매장</th>
                  <th className="px-5 py-3 text-left font-extrabold text-slate-600">핵심 지표</th>
                  <th className="px-5 py-3 text-right font-extrabold text-slate-500">목표치</th>
                  <th className="px-5 py-3 text-right font-extrabold text-slate-500">AS-IS</th>
                  <th className="px-5 py-3 text-right font-extrabold text-indigo-700 bg-indigo-50/50">TO-BE</th>
                  <th className="px-5 py-3 text-right font-extrabold text-slate-600">Gap</th>
                  <th className="px-5 py-3 text-right font-extrabold text-slate-600">달성률</th>
                  <th className="px-5 py-3 text-right font-extrabold text-slate-600">증감률</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredMetrics.map((row, idx) => (
                  <tr key={idx} className={`hover:bg-slate-50 transition-colors ${row.store === '전사' ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-5 py-2 font-bold text-slate-700">{row.store}</td>
                    <td className="px-5 py-2 font-medium text-slate-800">{row.metric}</td>
                    <td className="px-5 py-2 text-right text-slate-500">{row.target}</td>
                    <td className="px-5 py-2 text-right text-slate-600">{row.asIs}</td>
                    <td className="px-5 py-2 text-right font-bold text-slate-900 bg-indigo-50/30">{row.toBe}</td>
                    <td className={`px-5 py-2 text-right font-bold ${row.gap.includes('+') ? 'text-blue-600' : row.gap.includes('-') ? 'text-red-600' : 'text-slate-600'}`}>{row.gap}</td>
                    <td className="px-5 py-2 text-right font-medium text-slate-700">{row.achivement}</td>
                    <td className={`px-5 py-2 text-right font-bold ${row.growth.includes('+') ? 'text-blue-600' : row.growth.includes('-') ? 'text-red-600' : 'text-slate-600'}`}>{row.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedStore === '전사' || selectedStore === '강남점' ? (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-200 flex items-center bg-slate-50/50">
            <h2 className="text-xl font-extrabold text-slate-900">상세 분석(강남점)</h2>
          </div>
          <div className="p-6">
                <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="font-extrabold text-slate-900 text-lg">W10 핵심 이슈</span>
                  </div>
                  <ul className="list-disc pl-6 space-y-2 text-slate-800 font-medium">
                    <li>총 주문금액 <strong className="text-red-600">-6.62%</strong></li>
                    <li>홀매출 <strong className="text-red-600">-10.60%</strong> (W9 홀 급증 이후 조정)</li>
                    <li>배달매출 <strong className="text-slate-600">-0.10%</strong> (보합)</li>
                    <li>공헌이익률 <strong className="text-red-600">-14.40%p</strong> 하락</li>
                  </ul>
                </div>
          </div>
        </section>
        ) : null}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-200 flex items-center space-x-2 bg-slate-50/50">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">요일별 매출 트렌드</h2>
          </div>
          <div className="p-6">
            <div className="bg-indigo-50 rounded-xl p-5 mb-8 border border-indigo-100 flex items-start">
              <BrainCircuit className="w-6 h-6 text-indigo-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <span className="font-extrabold text-slate-900 block mb-1 text-lg">AI 요일별 진단 ({selectedStore})</span>
                <p className="text-slate-800 font-medium leading-relaxed">{activeDailyData.insight}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Advanced Menu Analysis */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between bg-slate-50/50 gap-4">
            <div className="flex items-center space-x-2">
              <Utensils className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-slate-800">심층 메뉴 분석</h2>
            </div>
            
            <div className="flex bg-slate-200 p-1 rounded-lg overflow-x-auto">
              <button 
                onClick={() => setMenuTab('overall')}
                className={`px-4 py-1.5 text-sm font-bold whitespace-nowrap rounded-md transition-colors ${menuTab === 'overall' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <BarChart3 className="w-4 h-4 inline mr-1.5 mb-0.5" /> 통합 카테고리
              </button>
              <button 
                onClick={() => setMenuTab('ranking')}
                className={`px-4 py-1.5 text-sm font-bold whitespace-nowrap rounded-md transition-colors ${menuTab === 'ranking' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ListOrdered className="w-4 h-4 inline mr-1.5 mb-0.5" /> 매장별 순위
              </button>
              <button 
                onClick={() => setMenuTab('region')}
                className={`px-4 py-1.5 text-sm font-bold whitespace-nowrap rounded-md transition-colors ${menuTab === 'region' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <MapPin className="w-4 h-4 inline mr-1.5 mb-0.5" /> 지역별 비교
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
                        <th className="px-5 py-3 text-right font-bold text-slate-600">W10 비중</th>
                        <th className="px-5 py-3 text-right font-bold text-slate-600">W9 비중</th>
                        <th className="px-5 py-3 text-right font-bold text-slate-600">증감 (W10 vs W9)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {menuOverallData.map((row, idx) => (
                        <tr key={idx} className={idx < 3 ? 'bg-slate-50/50' : ''}>
                          <td className="px-5 py-3 font-bold text-slate-800">{row.category}</td>
                          <td className="px-5 py-3 text-right text-slate-700 font-medium">{row.w10}</td>
                          <td className="px-5 py-3 text-right text-slate-500">{row.w9}</td>
                          <td className={`px-5 py-3 text-right font-bold ${row.gap.includes('+') ? 'text-blue-600' : 'text-red-600'}`}>{row.gap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {menuTab === 'ranking' && (
              <div className="animate-in fade-in">
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-5 py-3 text-left font-bold text-slate-600">메뉴 카테고리</th>
                        <th className="px-5 py-3 text-left font-bold text-amber-600">🥇 1위 매장 (점유율)</th>
                        <th className="px-5 py-3 text-left font-bold text-slate-500">🥈 2위 매장 (점유율)</th>
                        <th className="px-5 py-3 text-left font-bold text-orange-700">🥉 3위 매장 (점유율)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {menuRankingData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5 font-bold text-slate-800 bg-slate-50/50">{row.category}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-700">{row.rank1}</td>
                          <td className="px-5 py-3.5 font-medium text-slate-600">{row.rank2}</td>
                          <td className="px-5 py-3.5 font-medium text-slate-600">{row.rank3}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {menuTab === 'region' && (
              <div className="animate-in fade-in">
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 whitespace-nowrap">카테고리</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-600 whitespace-nowrap">서울권</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-600 whitespace-nowrap">경기/인천</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-600 whitespace-nowrap">제주권</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {menuRegionalData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{row.category}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">{row.seoul}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">{row.gyeonggi}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">{row.jeju}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
        </section>

        {/* Section 5: Ingredient Cost Analysis */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between bg-slate-50/50 gap-4">
            <div className="flex items-center space-x-2">
              <Package className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-slate-800">식자재 원가율 집중 분석 ({selectedStore})</h2>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className="font-bold text-slate-600">통합 원가율:</span>
              <span className="text-xl font-extrabold text-slate-900">{activeCostData.totalRatio}</span>
              <span className={`font-bold px-2 py-0.5 rounded ${activeCostData.gap.includes('+') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {activeCostData.gap}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <div className="bg-red-50 rounded-xl p-5 mb-8 border border-red-100 flex items-start">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <span className="font-extrabold text-slate-900 block mb-1 text-lg">AI 비용 진단</span>
                <p className="text-slate-800 font-medium leading-relaxed">{activeCostData.insight}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeCostData.items.map((item: any, idx: number) => (
                <div key={idx} className="bg-white border text-sm md:text-base border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors shadow-sm relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-2 h-full ${item.status === '정상' ? 'bg-green-500' : item.status === '주의' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                  <h3 className="text-slate-500 font-bold mb-1 flex items-center justify-between">
                    {item.name}
                    <span className={`text-xs px-2 py-0.5 rounded font-black tracking-wide ${item.color}`}>
                      {item.status}
                    </span>
                  </h3>
                  <div className="text-2xl font-black text-slate-900 mb-2 truncate" title={item.cost}>{item.cost}</div>
                  <div className="flex items-center justify-between text-sm font-medium pt-3 border-t border-slate-100 mt-3">
                    <span className="text-slate-500">배분율: <strong className="text-slate-800">{item.ratio}</strong></span>
                    <span className={item.gap.includes('+') ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{item.gap}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

