"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DateTime } from 'luxon';
import { RefreshCw, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Log {
    id: number;
    level: string;
    source: string;
    message: string;
    created_at: string;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLogs = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            const token = document.cookie.split("; ").find((row) => row.startsWith("admin_token="))?.split("=")[1];

            if (!token) {
                window.location.href = '/login';
                return;
            }

            const res = await axios.get(`/api/v1/system/logs?limit=500`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setLogs(res.data.data);
            }
        } catch (err: any) {
            console.error('Failed to fetch logs', err);
            if (err.response?.status === 401) {
                window.location.href = '/login';
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const formatDate = (isoStr: string) => {
        if (!isoStr) return '-';
        return DateTime.fromISO(isoStr).toFormat('yyyy.MM.dd HH:mm:ss');
    };

    const getLevelBadge = (level: string) => {
        switch (level) {
            case 'INFO':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E8F8EE] text-[#00C471]"><CheckCircle2 className="w-3.5 h-3.5" /> 정상</span>;
            case 'WARNING':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF4E5] text-[#F9A825]"><Info className="w-3.5 h-3.5" /> 경고</span>;
            case 'ERROR':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEE4E2] text-[#F04438]"><ShieldAlert className="w-3.5 h-3.5" /> 에러</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F2F4F6] text-[#4E5968]">{level}</span>;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#191F28] mb-2">시스템 로그 모니터링</h1>
                    <p className="text-[#8B95A1] font-medium">RestoGenie 백엔드의 전반적인 활동 및 에러 로그입니다.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchLogs(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E8EB] text-[#4E5968] rounded-xl font-semibold hover:bg-[#F2F4F6] transition-colors shadow-sm"
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                        새로고침
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#F2F4F6] bg-[#F9FAFB]">
                    <h3 className="text-sm font-bold text-[#4E5968]">전체 로그 내역 ({logs.length}건)</h3>
                </div>

                {loading ? (
                    <div className="px-6 py-12 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3182F6]"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="px-6 py-16 text-center text-[#8B95A1]">
                        <p className="mb-2">기록된 시스템 로그가 없습니다.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-[#F2F4F6]">
                                    <th className="px-6 py-4 text-xs font-semibold text-[#8B95A1] uppercase tracking-wider">시간</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-[#8B95A1] uppercase tracking-wider">상태</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-[#8B95A1] uppercase tracking-wider">출처 (Source)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-[#8B95A1] uppercase tracking-wider w-full">메시지</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F2F4F6]">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[#F9FAFB] transition-colors">
                                        <td className="px-6 py-4 text-sm text-[#4E5968] font-mono">{formatDate(log.created_at)}</td>
                                        <td className="px-6 py-4">{getLevelBadge(log.level)}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-[#191F28]">{log.source}</td>
                                        <td className="px-6 py-4 text-sm text-[#4E5968] truncate max-w-lg" title={log.message}>
                                            {log.message}
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
