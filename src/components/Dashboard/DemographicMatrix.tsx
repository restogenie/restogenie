import React, { useMemo, useState } from 'react';
import { Users, Filter, ArrowRight } from 'lucide-react';

const TIME_BLOCKS = [
  { label: '아침 (06-10시)', query: (h: number) => h >= 6 && h <= 10 },
  { label: '점심 (11-14시)', query: (h: number) => h >= 11 && h <= 14 },
  { label: '오후 (15-17시)', query: (h: number) => h >= 15 && h <= 17 },
  { label: '저녁 (18-21시)', query: (h: number) => h >= 18 && h <= 21 },
  { label: '야간 (22-05시)', query: (h: number) => h >= 22 || h <= 5 }
];

interface MatrixData {
  hour: number;
  demographic: string;
  passBy: number;
  visit: number;
  estSales: number;
}

interface Props {
  data: MatrixData[];
}

export default function DemographicMatrix({ data }: Props) {
  const [activeTab, setActiveTab] = useState<'funnel' | 'sales'>('funnel');

  // Process data into Time Block x Demographic
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return { demographics: [], matrix: {} };

    const matrixObj: Record<string, Record<string, any>> = {};
    const demoTotals: Record<string, number> = {};

    TIME_BLOCKS.forEach(block => {
      matrixObj[block.label] = {};
    });

    data.forEach(item => {
      // Find matching time block
      const block = TIME_BLOCKS.find(b => b.query(item.hour))?.label || '기타';
      if (!matrixObj[block]) matrixObj[block] = {};

      const demo = item.demographic;
      if (!matrixObj[block][demo]) {
        matrixObj[block][demo] = { passBy: 0, visit: 0, estSales: 0 };
      }

      matrixObj[block][demo].passBy += item.passBy;
      matrixObj[block][demo].visit += item.visit;
      matrixObj[block][demo].estSales += item.estSales;

      demoTotals[demo] = (demoTotals[demo] || 0) + item.visit;
    });

    // Get top 6 demographics by total visits
    const topDemographics = Object.entries(demoTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(entry => entry[0]);

    return { demographics: topDemographics, matrix: matrixObj };
  }, [data]);

  const { demographics, matrix } = processedData;

  if (!data || data.length === 0 || demographics.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center mt-6">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium text-sm">교차 분석을 위한 데모그래픽 데이터가 부족합니다.</p>
      </div>
    );
  }

  const renderCellData = (cell: any) => {
    if (!cell || cell.passBy === 0) return <div className="text-xs text-slate-400">-</div>;
    
    if (activeTab === 'funnel') {
      const visitRate = cell.passBy > 0 ? ((cell.visit / cell.passBy) * 100).toFixed(1) : '0.0';
      const intensity = Math.min((cell.visit / cell.passBy) * 2, 1); // visually scale opacity
      
      return (
        <div className="flex flex-col items-center justify-center p-2 h-full rounded transition-all hover:ring-2 hover:ring-indigo-300" 
             style={{ backgroundColor: `rgba(99, 102, 241, ${intensity * 0.3})` }}>
          <span className="text-[13px] font-extrabold text-slate-800">{visitRate}%</span>
          <span className="text-[10px] text-slate-500 font-medium">유입: {cell.visit}명</span>
        </div>
      );
    } else {
      const salesRate = cell.visit > 0 ? ((cell.estSales / cell.visit) * 100).toFixed(1) : '0.0';
      const intensity = Math.min((cell.estSales / cell.visit) * 3, 1);
      
      return (
        <div className="flex flex-col items-center justify-center p-2 h-full rounded transition-all hover:ring-2 hover:ring-pink-300"
             style={{ backgroundColor: `rgba(236, 72, 153, ${intensity * 0.3})` }}>
           <span className="text-[13px] font-extrabold text-pink-700">{salesRate}%</span>
           <span className="text-[10px] text-slate-500 font-medium">추정: {cell.estSales}건</span>
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mt-6 overflow-hidden animate-in fade-in">
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-500" />
            시간 × 타겟 고객 교차 분석 (Cross-tab)
          </h3>
          <p className="text-sm text-slate-500 mt-1">시간대별 핵심 방문 연령/성별의 전환율 성과를 추적합니다.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
             onClick={() => setActiveTab('funnel')}
             className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${activeTab === 'funnel' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            유입 (유동객 → 방문)
          </button>
          <button 
             onClick={() => setActiveTab('sales')}
             className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${activeTab === 'sales' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            주문 (방문 → 결제 추정)
          </button>
        </div>
      </div>

      <div className="p-6 overflow-x-auto">
        {activeTab === 'sales' && (
          <div className="mb-4 inline-flex items-center gap-2 bg-pink-50 text-pink-700 text-xs px-3 py-1.5 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
            결제 데이터에는 성연령 정보가 없으므로 해당 시간 방문객의 인구통계 비율을 곱하여 산출한 AI 추정치입니다.
          </div>
        )}

        <table className="w-full min-w-[700px] border-collapse relative">
          <thead>
            <tr>
              <th className="p-3 text-left font-extrabold text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 bg-slate-50 sticky left-0 z-10 w-32">
                타겟 (Top 6)
              </th>
              {TIME_BLOCKS.map(block => (
                <th key={block.label} className="p-3 text-center font-bold text-slate-600 border-b border-slate-200 text-sm">
                  {block.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {demographics.map((demo, idx) => (
              <tr key={demo} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-800 text-sm bg-slate-50/30 sticky left-0 z-10">
                  {idx + 1}. {demo}
                </td>
                {TIME_BLOCKS.map(block => (
                  <td key={block.label} className="p-1.5 h-16 w-[16%]">
                     {renderCellData(matrix[block.label]?.[demo])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
