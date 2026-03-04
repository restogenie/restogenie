"use client";

import React from 'react';
import { StoreProvider } from '@/lib/StoreContext';
import { ClientHeader } from '@/components/ClientHeader';

export default function ClientAuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <StoreProvider>
            <div className="min-h-screen bg-[#F9FAFB] text-[#191F28] font-pretendard antialiased">
                <ClientHeader />
                <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </StoreProvider>
    );
}
