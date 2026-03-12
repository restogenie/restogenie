"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Cloud, LayoutDashboard } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-[#191F28]">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-[#F2F4F6]">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[#3182F6] flex items-center justify-center font-bold text-white shadow-sm">
              R
            </div>
            <span className="font-bold text-xl tracking-tight">RestoGenie</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[15px] font-medium text-[#4E5968] hover:text-[#191F28] transition-colors">기능 소개</a>
            <a href="#how-it-works" className="text-[15px] font-medium text-[#4E5968] hover:text-[#191F28] transition-colors">작동 방식</a>
            <a href="#pricing" className="text-[15px] font-medium text-[#4E5968] hover:text-[#191F28] transition-colors">요금제</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[15px] font-medium text-[#4E5968] hover:text-[#191F28] transition-colors hidden sm:block">
              로그인
            </Link>
            <Link href="/signup" className="bg-[#3182F6] hover:bg-[#1b64da] text-white text-[15px] font-semibold px-5 py-2.5 rounded-md transition-all shadow-sm">
              무료로 시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 sm:pt-40 sm:pb-24">
        <div className="container mx-auto max-w-7xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3182F6]/10 text-[#3182F6] font-semibold text-sm mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3182F6] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3182F6]"></span>
            </span>
            다중 POS 연동 SaaS 정식 출시
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#191F28] mb-6 leading-tight">
            흩어진 포스기 매출 데이터,<br className="hidden sm:block" />
            <span className="text-[#3182F6]">단 하나의 대시보드</span>에서 관리하세요
          </h1>
          <p className="text-lg sm:text-xl text-[#4E5968] mb-10 max-w-2xl mx-auto leading-relaxed">
            프랜차이즈 점주님을 위한 최적의 다중 매장 데이터 솔루션. 페이히어, 이지포스, 스마트로 등 어떤 포스기를 쓰더라도 클라우드에서 손쉽게 데이터를 통합합니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto bg-[#3182F6] hover:bg-[#1b64da] text-white text-lg font-semibold px-8 py-4 rounded-md transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2">
              지금 무료로 시작하기 <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-24 bg-[#F9FAFB] px-6 border-y border-[#F2F4F6]">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#191F28] tracking-tight mb-4">왜 RestoGenie인가요?</h2>
            <p className="text-[#4E5968] text-lg max-w-2xl mx-auto">개발팀 없이도 즉시 도입 가능한 완벽한 매장 데이터 파이프라인.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-md shadow-sm border border-[#F2F4F6] hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center mb-6">
                <Cloud className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#191F28] mb-3">서버리스 자동 동기화</h3>
              <p className="text-[#4E5968] leading-relaxed">
                매일 새벽 2시, 서버리스 클라우드에서 다수의 매장 데이터를 백그라운드로 안전하게 스크래핑 및 정규화합니다.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-md shadow-sm border border-[#F2F4F6] hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-md flex items-center justify-center mb-6">
                <LayoutDashboard className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#191F28] mb-3">다중 사업장 스위칭</h3>
              <p className="text-[#4E5968] leading-relaxed">
                계정 하나로 여러 사업장을 운영 중이신가요? 클릭 한 번이면 매장별 독립된 매출 데이터를 즉시 확인할 수 있습니다.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-md shadow-sm border border-[#F2F4F6] hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-md flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[#191F28] mb-3">이기종 POS 데이터 통합</h3>
              <p className="text-[#4E5968] leading-relaxed">
                페이히어, 스마트로, 이지포스 등 파편화된 결제 데이터를 하나의 통일된 ODS(Operational Data Store) 스키마로 적재합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-6 text-center">
        <div className="container mx-auto max-w-4xl bg-[#191F28] rounded-[2.5rem] p-12 sm:p-20 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 -ml-20 -mb-20"></div>

          <h2 className="text-3xl sm:text-5xl font-bold mb-6 tracking-tight relative z-10">데이터 기반의 프랜차이즈 경영,<br />지금 시작하세요</h2>
          <p className="text-[#B0B8C1] text-lg sm:text-xl mb-10 max-w-xl mx-auto relative z-10">
            복잡한 하드코딩 매핑이나 VPN 설정이 필요 없습니다. 안전한 클라우드에서 단 5분 만에 연동을 마칠 수 있습니다.
          </p>
          <Link href="/signup" className="inline-flex bg-white hover:bg-gray-100 text-[#191F28] text-lg font-semibold px-8 py-4 rounded-md transition-colors relative z-10 items-center gap-2">
            가입하고 매장 등록하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-[#8B95A1] text-sm font-medium border-t border-[#F2F4F6]">
        &copy; 2026 RestoGenie. All rights reserved.
      </footer>
    </div>
  );
}
