import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Users, 
  Store, 
  TrendingDown, 
  ArrowRight,
  BarChart2,
  Utensils,
  CheckCircle2,
  ChevronLeft,
  BellRing,
  Frown,
  Activity,
  Star,
  Zap,
  ShieldAlert
} from 'lucide-react';

// --- [가상 데이터 구성: 서비스 마케팅 이론 기반] ---
const STORES_DATA = [
  {
    id: 'hongdae',
    name: "00 F&B 홍대중앙점",
    status: "critical", // 매우 위험
    alertTitle: "풍요 속의 빈곤 (유입률 및 객단가 심각)",
    alertDesc: "유동인구는 최상위권이나 실제 매장 유입률이 평균을 크게 밑돌고 있습니다. 외관 가시성 및 가용능력 효율 점검이 시급합니다.",
    metrics: { traffic: "45,000명", visitors: "220명", captureRate: "0.48%", atv: "11,500원", rating: "4.2" },
    benchmarks: { captureRate: "1.2%", atv: "14,000원" },
    report: {
      causes: [
        { icon: Store, title: "1. 물리적 증거 관리 실패 (Chapter 8)", desc: "점포 외관(Facade)의 가시성이 매우 떨어집니다. 상권 내 경쟁 점포들의 화려한 간판과 프로모션 배너에 밀려 고객이 매장의 존재를 인지하지 못하고 지나치고 있습니다." },
        { icon: Users, title: "2. 수요와 가용능력 불균형 (Chapter 13)", desc: "금요일/주말 저녁 피크 타임 이탈률이 30%에 달합니다. 4인석 위주의 테이블에 1~2인 고객이 착석하여 외부에서 '자리가 없다'고 오인하게 만드는 비효율적인 레이아웃이 문제입니다." },
        { icon: Utensils, title: "3. 가격 및 촉진 전략 부재 (Chapter 9, 10)", desc: "베스트셀러 단품 판매 비율이 75%로 압도적입니다. 객단가를 높일 수 있는 '묶음가격(Bundling)' 프로모션이나 외부 유동인구를 유혹할 미끼 상품 노출이 전무합니다." }
      ],
      actions: [
        { type: "urgent", title: "[Action 1] 물리적 증거 시각적 촉진 강화", desc: "매장 전면 고화질 디지털 메뉴 보드 또는 대형 X-배너 설치 ('런치 타임 한정 세트 9,900원' 등)", btn: "X-배너 시안 지점 발송" },
        { type: "normal", title: "[Action 2] 가용능력 증대를 위한 레이아웃 재배치", desc: "현재 4인석 위주의 테이블을 2인석 단위로 분리 가능하게 전면 재배치하여 회전율 극대화", btn: "슈퍼바이저 현장 점검 지시" },
        { type: "normal", title: "[Action 3] 메뉴 엔지니어링 (묶음가격 전략)", desc: "매장 내 키오스크 첫 화면에 단품 대신 '객단가가 높은 2인 추천 세트' 전면 배치로 업셀링 유도", btn: "키오스크 UI 원격 업데이트" }
      ]
    }
  },
  {
    id: 'daehakro',
    name: "00 F&B 대학로점",
    status: "warning", // 주의
    alertTitle: "서비스 패러독스 (높은 매출 이면의 품질 저하)",
    alertDesc: "당장의 매출과 회전율은 우수하나 리뷰 평점이 최하위입니다. 단기 효율성에 집착하여 장기적 브랜드 가치가 훼손되고 재방문율이 급락 중입니다.",
    metrics: { traffic: "38,000명", visitors: "1,520명", captureRate: "4.0%", atv: "15,200원", rating: "2.8" },
    benchmarks: { captureRate: "1.2%", atv: "14,000원" },
    report: {
      causes: [
        { icon: TrendingDown, title: "1. 서비스 패러독스 및 효율성 함정 (Chapter 1, 12)", desc: "매출과 회전율(효율성)에만 집착하다 보니 서비스의 본질적인 품질이 훼손되었습니다. 직원은 기계적으로 일하고 고객은 대우받지 못한다고 느끼는 전형적인 '서비스 패러독스' 상태입니다." },
        { icon: Activity, title: "2. 대기 관리 및 MOT 실패 (Chapter 6)", desc: "피크타임 대기 관리 프로세스가 전무합니다. 체계 없는 대기 줄은 고객의 짜증을 유발하며, 바쁜 상황에서 고객과 직원이 만나는 짧은 순간(MOT)마다 불친절한 응대가 발생합니다." },
        { icon: Frown, title: "3. 내부 마케팅 부재로 인한 직원 번아웃 (Chapter 7)", desc: "직원 평균 근속 일수가 45일로 가맹점 최하위입니다. 감정적 케어 및 보상 부재로 직원의 피로도가 한계에 달해 청결 불량 등 기본 업무 누락과 고객 불만으로 전이되고 있습니다." }
      ],
      actions: [
        { type: "urgent", title: "[Action 1] 스마트 대기 시스템 및 테이블 오더 전면 도입", desc: "대기 등록 태블릿 설치로 대기 고객의 불안감 해소 및 전 좌석 테이블 오더 설치로 직원 업무 강도 완화", btn: "시스템 도입 품의서 작성" },
        { type: "normal", title: "[Action 2] 피크타임 인센티브제 및 '내부 마케팅' 강화", desc: "주말 등 업무 강도가 극심한 시간대 근무자에게 시급 외 추가 수당 즉각 도입으로 직원 사기 진작", btn: "점주 대상 내부 마케팅 가이드 발송" },
        { type: "urgent", title: "[Action 3] 갭(GAP) 분석 기반 서비스 회복 전략", desc: "최근 1개월 내 악성 리뷰에 본사 CS팀 직접 사과 댓글 작성 및 회복 쿠폰 발송 (부정적 구전 차단)", btn: "CS팀 서비스 회복 업무 할당" }
      ]
    }
  }
];

export default function RestoGenieDashboard() {
  const [selectedStore, setSelectedStore] = useState(null);
  const [activeTab, setActiveTab] = useState('insight');

  // 메인 대시보드 화면
  const renderDashboardHome = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 상단 헤더 & 써머리 */}
      <header className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold mb-3">
            <Zap size={16} className="fill-indigo-700" /> AI Data Engine
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            레스토지니 전략 관제소
          </h1>
          <p className="text-slate-500 mt-2 font-medium">실시간 F&B 프랜차이즈 서비스 마케팅 진단 시스템</p>
        </div>
        
        <div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <div className="text-center px-6 py-2 border-r border-slate-200">
            <div className="text-3xl font-black text-red-500">2</div>
            <div className="text-sm text-slate-500 font-bold mt-1">위험 매장</div>
          </div>
          <div className="text-center px-6 py-2 border-r border-slate-200">
            <div className="text-3xl font-black text-orange-500">5</div>
            <div className="text-sm text-slate-500 font-bold mt-1">주의 매장</div>
          </div>
          <div className="text-center px-6 py-2">
            <div className="text-3xl font-black text-emerald-500">142</div>
            <div className="text-sm text-slate-500 font-bold mt-1">정상 운영</div>
          </div>
        </div>
      </header>

      {/* 알림 리스트 섹션 */}
      <div>
        <div className="flex items-center gap-2 mb-6 px-1">
          <ShieldAlert className="text-slate-700" size={24} />
          <h2 className="text-xl font-extrabold text-slate-800">AI 전략 진단 요망 매장</h2>
          <span className="text-sm text-slate-500 font-medium ml-2">즉각적인 본사 조치가 필요합니다.</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {STORES_DATA.map(store => (
            <div key={store.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
              
              {/* 카드 헤더 */}
              <div className={`p-5 text-white flex justify-between items-center ${store.status === 'critical' ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-orange-500 to-amber-500'}`}>
                <div className="flex items-center gap-3 font-extrabold text-lg tracking-tight">
                  <AlertTriangle size={20} className="fill-white/20" />
                  {store.name}
                </div>
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                  {store.status === 'critical' ? '긴급 조치 요망' : '주의 관찰 요망'}
                </span>
              </div>
              
              {/* 카드 본문 */}
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-extrabold text-slate-800 text-lg mb-2">{store.alertTitle}</h3>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed line-clamp-2">{store.alertDesc}</p>
                
                {/* 주요 지표 미니 대시보드 */}
                <div className="grid grid-cols-3 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-auto">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 font-semibold mb-1">유입률</div>
                    <div className={`text-lg font-black tracking-tight ${store.metrics.captureRate < '1.0%' ? 'text-red-500' : 'text-slate-700'}`}>
                      {store.metrics.captureRate}
                    </div>
                  </div>
                  <div className="text-center border-l border-r border-slate-200/60">
                    <div className="text-xs text-slate-400 font-semibold mb-1">객단가</div>
                    <div className="text-lg font-black tracking-tight text-slate-700">{store.metrics.atv}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 font-semibold mb-1">리뷰평점</div>
                    <div className={`text-lg font-black tracking-tight flex items-center justify-center gap-1 ${store.metrics.rating < '3.0' ? 'text-red-500' : 'text-slate-700'}`}>
                      <Star size={16} className={store.metrics.rating < '3.0' ? 'fill-red-500 text-red-500' : 'fill-slate-400 text-slate-400'}/> 
                      {store.metrics.rating}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setSelectedStore(store);
                    setActiveTab('insight');
                  }}
                  className="w-full group bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white font-bold py-3.5 rounded-xl border-2 border-indigo-100 hover:border-indigo-600 transition-all flex items-center justify-center gap-2"
                >
                  상세 진단 레포트 열람 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 개별 매장 상세 진단 레포트 화면
  const renderStoreReport = () => {
    if (!selectedStore) return null;
    const isCritical = selectedStore.status === 'critical';

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
        
        {/* 네비게이션 & 타이틀 */}
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => setSelectedStore(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200"
          >
            <ChevronLeft size={18} /> 통합 관제 센터로 복귀
          </button>
          <div className="text-sm font-bold text-slate-400 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            진단 생성일: 2026-03-13
          </div>
        </div>

        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            {selectedStore.name} 전략 리포트
          </h1>
        </header>

        {/* AI 알림 배너 */}
        <div className={`rounded-3xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center gap-6 ${isCritical ? 'bg-gradient-to-br from-red-600 to-rose-500' : 'bg-gradient-to-br from-orange-500 to-amber-500'}`}>
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <div>
            <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-2">
              AI 핵심 진단 요약
            </div>
            <h2 className="text-2xl font-extrabold mb-2">{selectedStore.alertTitle}</h2>
            <p className="text-white/90 text-sm md:text-base font-medium leading-relaxed max-w-3xl">
              {selectedStore.alertDesc}
            </p>
          </div>
        </div>

        {/* 4대 KPI 매트릭스 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-sm font-bold text-slate-400 mb-2">상권 유동인구</div>
            <div className="text-3xl font-black text-slate-800 tracking-tighter">{selectedStore.metrics.traffic}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="text-sm font-bold text-slate-400 mb-2">유입 전환율</div>
            <div className={`text-3xl font-black tracking-tighter ${selectedStore.metrics.captureRate < '1.0%' ? 'text-red-500' : 'text-slate-800'}`}>
              {selectedStore.metrics.captureRate}
            </div>
            <div className="text-xs font-bold text-slate-400 mt-2 bg-slate-50 inline-block px-2 py-1 rounded">정상 목표: {selectedStore.benchmarks.captureRate}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-sm font-bold text-slate-400 mb-2">평균 객단가</div>
            <div className="text-3xl font-black text-slate-800 tracking-tighter">{selectedStore.metrics.atv}</div>
            <div className="text-xs font-bold text-slate-400 mt-2 bg-slate-50 inline-block px-2 py-1 rounded">정상 목표: {selectedStore.benchmarks.atv}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-sm font-bold text-slate-400 mb-2">고객 리뷰 평점</div>
            <div className={`text-3xl font-black tracking-tighter flex items-end gap-1 ${selectedStore.metrics.rating < '3.0' ? 'text-red-500' : 'text-slate-800'}`}>
              {selectedStore.metrics.rating} <span className="text-base font-bold text-slate-400 mb-1">/ 5.0</span>
            </div>
          </div>
        </div>

        {/* 진단 및 액션 탭 컨테이너 */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-8">
          
          {/* 탭 헤더 */}
          <div className="flex border-b border-slate-200">
            <button 
              className={`flex-1 py-5 text-sm md:text-base font-extrabold flex items-center justify-center gap-3 transition-colors ${activeTab === 'insight' ? 'bg-indigo-50/50 text-indigo-700 border-b-4 border-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              onClick={() => setActiveTab('insight')}
            >
              <Activity size={20} className={activeTab === 'insight' ? 'text-indigo-600' : ''} /> 
              서비스 마케팅 원인 분석 (Root Cause)
            </button>
            <button 
              className={`flex-1 py-5 text-sm md:text-base font-extrabold flex items-center justify-center gap-3 transition-colors ${activeTab === 'action' ? 'bg-indigo-50/50 text-indigo-700 border-b-4 border-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              onClick={() => setActiveTab('action')}
            >
              <CheckCircle2 size={20} className={activeTab === 'action' ? 'text-indigo-600' : ''} /> 
              본사 실행 과제 (Action Items)
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full ml-1">3건</span>
            </button>
          </div>

          {/* 탭 본문 */}
          <div className="p-6 md:p-10 bg-slate-50/30">
            
            {/* 원인 분석 (Insight) 탭 */}
            {activeTab === 'insight' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {selectedStore.report.causes.map((cause, idx) => {
                  const Icon = cause.icon;
                  return (
                    <div key={idx} className="flex flex-col md:flex-row gap-5 items-start bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 shrink-0">
                        <Icon size={28} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-extrabold text-slate-800 text-lg md:text-xl mb-2">{cause.title}</h4>
                        <p className="text-slate-600 font-medium leading-relaxed text-sm md:text-base">
                          {cause.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 실행 과제 (Action) 탭 */}
            {activeTab === 'action' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {selectedStore.report.actions.map((action, idx) => (
                  <div key={idx} className="bg-white border-2 border-slate-100 rounded-2xl p-6 md:p-8 hover:border-indigo-200 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-extrabold text-indigo-800 text-lg">
                          {action.title}
                        </h4>
                        {action.type === 'urgent' && (
                          <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full font-black tracking-wide border border-red-200">
                            긴급 실행
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 font-medium text-sm md:text-base leading-relaxed">
                        {action.desc}
                      </p>
                    </div>
                    <button className="w-full md:w-auto shrink-0 text-sm font-bold text-white bg-slate-800 px-6 py-3.5 rounded-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 shadow-sm">
                      {action.btn} <ArrowRight size={18}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        {selectedStore ? renderStoreReport() : renderDashboardHome()}
      </div>
    </div>
  );
}

