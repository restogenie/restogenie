import React from 'react';
import ClientAuthLayout from '@/components/ClientAuthLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'RestoGenie Dashboard',
    description: '매출 대시보드 및 지표 연동 관리',
};

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClientAuthLayout>
            {children}
        </ClientAuthLayout>
    );
}
