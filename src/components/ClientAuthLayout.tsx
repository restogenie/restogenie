"use client";

import React from 'react';
import { StoreProvider } from '@/lib/StoreContext';
import { ClientHeader } from '@/components/ClientHeader';
import FloatingChatAgent from '@/components/FloatingChatAgent';
import { usePathname } from 'next/navigation';

export default function ClientAuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isChatRoute = pathname?.startsWith('/chat');

    return (
        <StoreProvider>
            <div className={`min-h-screen bg-[#F9FAFB] text-[#191F28] font-pretendard antialiased ${isChatRoute ? 'overflow-hidden flex flex-col h-screen' : ''}`}>
                <ClientHeader />
                <main className={isChatRoute ? "pt-16 flex-1 w-full h-full overflow-hidden" : "pt-24 pb-12 px-6 max-w-7xl mx-auto"}>
                    {children}
                </main>
                {!isChatRoute && <FloatingChatAgent />}
            </div>
        </StoreProvider>
    );
}
