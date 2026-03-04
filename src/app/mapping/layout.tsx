import React from 'react';

export default function MappingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#F9FAFB] text-[#191F28] font-pretendard antialiased">
            <header className="fixed top-0 w-full h-16 bg-white/80 backdrop-blur-md border-b border-[#F2F4F6] z-50 px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
                        R
                    </div>
                    <span className="font-bold text-lg tracking-tight mr-6">RestoGenie</span>
                    <nav className="flex items-center gap-6 border-l border-[#F2F4F6] pl-6 h-6">
                        <a href="/dashboard" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">매출 대시보드</a>
                        <a href="/mapping" className="text-sm font-bold text-[#191F28] hover:text-[#3182F6] transition-colors">메뉴 맵핑</a>
                        <a href="/logs" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">시스템 로그</a>
                    </nav>
                </div>
                <div>
                    <a href="/" className="px-4 py-2 bg-[#191F28] text-white text-sm font-medium rounded-lg hover:bg-[#333D4B] transition-colors shadow-sm">
                        + 신규 API 설정
                    </a>
                </div>
            </header>

            <main className="pt-24 pb-12 px-6 max-w-[1400px] mx-auto">
                {children}
            </main>
        </div>
    );
}
