"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Save, Store, Edit2, Sparkles, AlertCircle, FileText, CheckCircle2, ChevronDown, ListFilter, Play } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DateTime } from 'luxon';
import { useStore } from '@/lib/StoreContext';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Mapping {
    id?: number;
    provider: string;
    original_name: string;
    normalized_name: string;
    custom_id?: string | null;
    is_option?: boolean;
    created_at?: string;
    updated_at?: string;
    isEditing?: boolean;
}

interface UnmappedItem {
    provider: string;
    product_name: string;
    recent_create: string;
}

interface MappingStats {
    total: number;
    mapped: number;
    pending: number;
    rate: number;
    new_this_week: number;
}

export default function MappingPage() {
    const { currentStore } = useStore();

    // Data States
    const [mappedItems, setMappedItems] = useState<Mapping[]>([]);
    const [unmappedItems, setUnmappedItems] = useState<UnmappedItem[]>([]);
    const [stats, setStats] = useState<MappingStats>({ total: 0, mapped: 0, pending: 0, rate: 0, new_this_week: 0 });

    // UI States
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [suggestingAI, setSuggestingAI] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'registered'>('pending');
    const [showNewOnly, setShowNewOnly] = useState(false);

    // Form/Edit States (for Unmapped / Edit)
    const [draftMappings, setDraftMappings] = useState<Record<string, Partial<Mapping>>>({});
    const [savingItem, setSavingItem] = useState<string | null>(null);

    const fetchMappings = async (isRefresh = false) => {
        if (!currentStore) return;
        try {
            if (isRefresh) setRefreshing(true);
            const token = document.cookie.split("; ").find((row) => row.startsWith("admin_token="))?.split("=")[1];

            if (!token) return;

            const res = await axios.get(`/api/v1/sync/mapping?store_id=${currentStore.id}&limit=500`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setStats(res.data.data.stats);
                setMappedItems(res.data.data.mapped);
                setUnmappedItems(res.data.data.unmapped);
            }
        } catch (err: any) {
            console.error('Failed to fetch mappings', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (currentStore) {
            fetchMappings();
            setDraftMappings({});
        }
    }, [currentStore]);

    const handleAISuggest = async () => {
        if (!currentStore) return;
        setSuggestingAI(true);
        const loadingToast = toast.loading("✨ AI가 미분류 메뉴를 스캔하고 최적의 이름으로 추천 중입니다...", { duration: 15000 });

        try {
            const token = document.cookie.split("; ").find((row) => row.startsWith("admin_token="))?.split("=")[1];
            const res = await axios.post(`/api/v1/mapping/ai-suggest`, {
                store_id: currentStore.id
            }, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.data?.status === 'success' && res.data.data) {
                if (res.data.count > 0) {
                    toast.success(res.data.message, { id: loadingToast, duration: 4000 });

                    // Apply AI suggestions to draft local state
                    const newDrafts = { ...draftMappings };
                    res.data.data.forEach((aiItem: any) => {
                        const originalName = aiItem.original_name || aiItem.product_name;
                        if (!originalName) return; // Skip if somehow null
                        const provider = (aiItem.provider || '').toLowerCase();

                        const key = `${provider}_${originalName}`;
                        newDrafts[key] = {
                            normalized_name: aiItem.normalized_name || '',
                            custom_id: aiItem.custom_id || '',
                            is_option: aiItem.is_option || false
                        };
                    });
                    setDraftMappings(newDrafts);
                    setActiveTab('pending');
                } else {
                    toast.success(res.data.message || "매핑할 신규 항목이 없습니다.", { id: loadingToast, icon: "✨" });
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "AI 자동 매핑에 실패했습니다.", { id: loadingToast });
            console.error(err);
        } finally {
            setSuggestingAI(false);
        }
    };

    const handleSaveSingle = async (provider: string, originalName: string) => {
        const draftKey = `${provider}_${originalName}`;
        const draft = draftMappings[draftKey];
        if (!draft || !draft.normalized_name) {
            toast.error("정규화 상품명을 입력해주세요.");
            return;
        }

        setSavingItem(draftKey);
        try {
            const token = document.cookie.split("; ").find((row) => row.startsWith("admin_token="))?.split("=")[1];
            await axios.post(`/api/v1/sync/mapping`, {
                store_id: currentStore?.id,
                provider,
                original_name: originalName,
                normalized_name: draft.normalized_name,
                custom_id: draft.custom_id,
                is_option: draft.is_option
            }, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            toast.success(`'${originalName}' 매핑이 저장되었습니다.`);

            // Remove from draft and refetch
            const newDrafts = { ...draftMappings };
            delete newDrafts[draftKey];
            setDraftMappings(newDrafts);

            fetchMappings();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "저장에 실패했습니다.");
            console.error(err);
        } finally {
            setSavingItem(null);
        }
    };

    const updateDraft = (provider: string, originalName: string, field: string, value: any) => {
        const key = `${provider}_${originalName}`;
        setDraftMappings(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }));
    };

    const formatDate = (isoStr: string) => {
        if (!isoStr) return '-';
        return DateTime.fromISO(isoStr).toFormat('yyyy.MM.dd HH:mm');
    };

    const renderProviderBadge = (provider: string) => {
        if (provider === 'payhere') return <span className="inline-flex px-2 py-1 rounded-md text-xs font-semibold bg-[#E8F8EE] text-[#00C471]">페이히어</span>;
        if (provider === 'smartro') return <span className="inline-flex px-2 py-1 rounded-md text-xs font-semibold bg-[#E8F8EE] text-[#3182F6]">스마트로</span>;
        if (provider === 'baemin') return <span className="inline-flex px-2 py-1 rounded-md text-xs font-semibold bg-[#E6F4FB] text-[#2AC1BC]">배민</span>;
        if (provider === 'yogiyo') return <span className="inline-flex px-2 py-1 rounded-md text-xs font-semibold bg-[#FAEDEF] text-[#FA0050]">요기요</span>;
        if (provider === 'coupangeats') return <span className="inline-flex px-2 py-1 rounded-md text-xs font-semibold bg-[#E6F4FB] text-[#00A5E5]">쿠팡이츠</span>;
        return <span className="inline-flex px-2 py-1 rounded-md text-xs font-semibold bg-[#FEF4E5] text-[#F9A825]">이지포스</span>;
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Filter unmapped items
    const displayUnmapped = showNewOnly
        ? unmappedItems.filter(item => new Date(item.recent_create) > oneWeekAgo)
        : unmappedItems;

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#191F28] mb-2">메뉴명 정규화 (Mapping)</h1>
                    <p className="text-[#8B95A1] font-medium">포스사마다 다른 원본 상품명을 하나의 이름과 고유 코드로 통합 관리하세요.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleAISuggest}
                        disabled={suggestingAI || stats.pending === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-600 rounded-xl font-bold hover:from-indigo-100 hover:to-purple-100 transition-all shadow-sm disabled:opacity-50"
                    >
                        <Sparkles className={cn("w-4 h-4", suggestingAI && "animate-pulse")} />
                        ✨ AI 추천 받기
                    </button>
                    <button
                        onClick={() => fetchMappings(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E8EB] text-[#4E5968] rounded-xl font-semibold hover:bg-[#F2F4F6] transition-colors shadow-sm"
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                        새로고침
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-[#F2F4F6] p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[#8B95A1] font-semibold text-sm">전체 취급 메뉴수</span>
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-500" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-[#191F28]">{stats.total.toLocaleString()}<span className="text-sm font-medium text-[#8B95A1] ml-1">건</span></div>
                </div>

                <div className="bg-white rounded-2xl border border-[#F2F4F6] p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[#8B95A1] font-semibold text-sm">정규화 매핑 완료</span>
                        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-1.5">
                            <div className="text-2xl font-bold text-[#191F28]">{stats.mapped.toLocaleString()}<span className="text-sm font-medium text-[#8B95A1] ml-1">건</span></div>
                            <span className="text-sm font-bold text-green-600">{stats.rate}%</span>
                        </div>
                        <div className="w-full bg-[#F2F4F6] rounded-full h-1.5 overflow-hidden">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${stats.rate}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#F2F4F6] p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[#8B95A1] font-semibold text-sm">매핑 대기 (미분류)</span>
                        <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-[#191F28]">{stats.pending.toLocaleString()}<span className="text-sm font-medium text-[#8B95A1] ml-1">건</span></div>
                </div>

                <button
                    onClick={() => { setActiveTab('pending'); setShowNewOnly(true); }}
                    className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl border border-indigo-400 p-5 shadow-sm flex flex-col justify-between text-left hover:shadow-md transition-shadow group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <span className="text-white/90 font-semibold text-sm">이번주 신규 대기건수</span>
                        <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                            New
                        </div>
                    </div>
                    <div className="text-white relative z-10 flex justify-between items-end">
                        <span className="text-2xl font-bold">{stats.new_this_week.toLocaleString()}<span className="text-sm font-medium text-white/80 ml-1">건 (클릭하여 보기)</span></span>
                        <Play className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                    </div>
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-6 border-b border-[#F2F4F6] px-1">
                <button
                    onClick={() => { setActiveTab('pending'); setShowNewOnly(false); }}
                    className={cn(
                        "pb-4 text-[15px] font-bold transition-colors relative",
                        activeTab === 'pending' ? "text-[#191F28]" : "text-[#8B95A1] hover:text-[#4E5968]"
                    )}
                >
                    매핑 대기 (미분류)
                    <span className="ml-2 bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                        {stats.pending.toLocaleString()}
                    </span>
                    {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#191F28] rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => { setActiveTab('registered'); setShowNewOnly(false); }}
                    className={cn(
                        "pb-4 text-[15px] font-bold transition-colors relative",
                        activeTab === 'registered' ? "text-[#191F28]" : "text-[#8B95A1] hover:text-[#4E5968]"
                    )}
                >
                    등록된 맵핑 규칙
                    <span className="ml-2 bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                        {stats.mapped.toLocaleString()}
                    </span>
                    {activeTab === 'registered' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#191F28] rounded-t-full"></div>}
                </button>
            </div>

            {/* Tab Contents */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] overflow-hidden">

                {/* Pending Tab Payload */}
                {activeTab === 'pending' && (
                    <div className="flex flex-col">
                        <div className="px-5 py-4 border-b border-[#F2F4F6] bg-[#F9FAFB] flex justify-between items-center">
                            <h3 className="text-[13px] font-bold text-[#4E5968] flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-[#8B95A1]" /> 지정되지 않은 신규 메뉴 목록
                            </h3>
                            {showNewOnly && (
                                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold" onClick={() => setShowNewOnly(false)}>
                                    <ListFilter className="w-3.5 h-3.5" /> 이번주 유입 필터 해제
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="p-16 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
                        ) : displayUnmapped.length === 0 ? (
                            <div className="p-16 text-center text-[#8B95A1]">
                                <CheckCircle2 className="w-12 h-12 mx-auto text-[#E5E8EB] mb-4" />
                                <p className="mb-2 font-bold text-[#4E5968]">모든 메뉴가 완벽하게 매핑되었습니다!</p>
                                <p className="text-sm">현재 대기중인 미분류 항목이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#FFFFFF] border-b border-[#F2F4F6]">
                                        <tr>
                                            <th className="px-5 py-4 font-semibold text-[#8B95A1] w-48">원본 환경 / 이름</th>
                                            <th className="px-5 py-4 font-semibold text-[#8B95A1] w-48">정규화 이름 (통합)<span className="text-red-500 ml-1">*</span></th>
                                            <th className="px-5 py-4 font-semibold text-[#8B95A1] w-40">자체 관리 ID (Option)</th>
                                            <th className="px-5 py-4 font-semibold text-[#8B95A1] w-32">종류</th>
                                            <th className="px-5 py-4 font-semibold text-[#8B95A1] text-right">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F2F4F6]">
                                        {displayUnmapped.map((m) => {
                                            const key = `${m.provider}_${m.product_name}`;
                                            const drf = draftMappings[key] || {};
                                            const isSaving = savingItem === key;

                                            return (
                                                <tr key={key} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-5 py-4 align-top">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div>{renderProviderBadge(m.provider)}</div>
                                                            <span className="font-semibold text-[#191F28] whitespace-normal max-w-[200px] break-keep">{m.product_name}</span>
                                                            <span className="text-[11px] text-[#8B95A1]">{formatDate(m.recent_create)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 align-top">
                                                        <input
                                                            type="text"
                                                            placeholder="예: 클래식버거"
                                                            value={drf.normalized_name || ''}
                                                            onChange={e => updateDraft(m.provider, m.product_name, 'normalized_name', e.target.value)}
                                                            className={cn("w-full h-10 px-3 rounded-lg border focus:ring-2 focus:ring-[#3182F6]/20 transition-all font-semibold outline-none",
                                                                drf.normalized_name ? "border-[#3182F6] bg-blue-50/50 text-[#191F28]" : "border-[#E5E8EB] bg-[#F9FAFB] text-[#4E5968]"
                                                            )}
                                                        />
                                                    </td>
                                                    <td className="px-5 py-4 align-top">
                                                        <input
                                                            type="text"
                                                            placeholder="예: BURG-001"
                                                            value={drf.custom_id || ''}
                                                            onChange={e => updateDraft(m.provider, m.product_name, 'custom_id', e.target.value)}
                                                            className="w-full h-10 px-3 rounded-lg border border-[#E5E8EB] bg-[#F9FAFB] focus:bg-white focus:border-[#3182F6] transition-all font-medium text-[#4E5968] outline-none placeholder:text-gray-300"
                                                        />
                                                    </td>
                                                    <td className="px-5 py-4 align-top">
                                                        <div className="relative">
                                                            <select
                                                                value={drf.is_option ? 'true' : 'false'}
                                                                onChange={e => updateDraft(m.provider, m.product_name, 'is_option', e.target.value === 'true')}
                                                                className={cn("w-full h-10 px-3 pr-8 rounded-lg border focus:bg-white transition-all font-medium outline-none appearance-none",
                                                                    drf.is_option ? "bg-gray-100 border-gray-200 text-gray-600" : "bg-blue-50/50 border-blue-200 text-blue-700"
                                                                )}
                                                            >
                                                                <option value="false">메인 메뉴</option>
                                                                <option value="true">기타 옵션</option>
                                                            </select>
                                                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 align-top text-right">
                                                        <button
                                                            onClick={() => handleSaveSingle(m.provider, m.product_name)}
                                                            disabled={!drf.normalized_name || isSaving}
                                                            className="h-10 px-4 bg-[#191F28] hover:bg-[#4E5968] text-white rounded-lg font-semibold transition-colors disabled:opacity-30 disabled:hover:bg-[#191F28] flex items-center gap-1.5 ml-auto"
                                                        >
                                                            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                            확정
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Registered Tab Payload */}
                {activeTab === 'registered' && (
                    <div className="flex flex-col">
                        <div className="px-5 py-4 border-b border-[#F2F4F6] bg-[#F9FAFB] flex justify-between items-center">
                            <h3 className="text-[13px] font-bold text-[#4E5968] flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#00C471]" /> 기존에 등록 완료된 규칙 목록
                            </h3>
                        </div>

                        {loading ? (
                            <div className="p-16 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
                        ) : mappedItems.length === 0 ? (
                            <div className="p-16 text-center text-[#8B95A1]">
                                <Store className="w-12 h-12 mx-auto text-[#E5E8EB] mb-4" />
                                <p className="mb-2 font-medium">등록된 메뉴 맵핑이 없습니다.</p>
                                <p className="text-sm">미분류 탭에서 새로운 규칙을 추가해주세요.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#FFFFFF] border-b border-[#F2F4F6]">
                                        <tr>
                                            <th className="px-5 py-4 font-semibold text-[#8B95A1] w-48">원본 환경 / 이름</th>
                                            <th className="px-5 py-4 font-semibold text-[#8B95A1] w-48">정규화 이름 (통합)</th>
                                            <th className="px-5 py-4 font-semibold text-[#8B95A1] w-40">자체 관리 ID</th>
                                            <th className="px-5 py-4 font-semibold text-[#8B95A1] w-32">종류</th>
                                            <th className="px-5 py-4 font-semibold text-[#8B95A1] text-right">수정일</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F2F4F6]">
                                        {mappedItems.map((m) => {
                                            const key = `${m.provider}_${m.original_name}`;
                                            const drf = draftMappings[key] || {};
                                            const isEditing = drf.isEditing;
                                            const isSaving = savingItem === key;

                                            if (isEditing) {
                                                return (
                                                    <tr key={key} className="bg-blue-50/20">
                                                        <td className="px-5 py-4 align-top">
                                                            <div className="flex flex-col gap-1.5">
                                                                <div>{renderProviderBadge(m.provider)}</div>
                                                                <span className="font-semibold text-gray-400 line-through decoration-1 max-w-[200px] break-keep whitespace-normal">{m.original_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 align-top">
                                                            <input
                                                                type="text"
                                                                value={drf.normalized_name || ''}
                                                                onChange={e => updateDraft(m.provider, m.original_name, 'normalized_name', e.target.value)}
                                                                className="w-full h-10 px-3 border border-[#3182F6] rounded-lg font-bold outline-none"
                                                            />
                                                        </td>
                                                        <td className="px-5 py-4 align-top">
                                                            <input
                                                                type="text"
                                                                value={drf.custom_id || ''}
                                                                onChange={e => updateDraft(m.provider, m.original_name, 'custom_id', e.target.value)}
                                                                className="w-full h-10 px-3 border border-gray-300 rounded-lg outline-none font-medium"
                                                            />
                                                        </td>
                                                        <td className="px-5 py-4 align-top">
                                                            <div className="relative">
                                                                <select
                                                                    value={drf.is_option ? 'true' : 'false'}
                                                                    onChange={e => updateDraft(m.provider, m.original_name, 'is_option', e.target.value === 'true')}
                                                                    className="w-full h-10 px-3 pr-8 rounded-lg border border-gray-300 outline-none appearance-none"
                                                                >
                                                                    <option value="false">메인 메뉴</option>
                                                                    <option value="true">기타 옵션</option>
                                                                </select>
                                                                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 align-top text-right">
                                                            <div className="flex flex-col gap-2 items-end">
                                                                <button
                                                                    onClick={() => handleSaveSingle(m.provider, m.original_name)}
                                                                    disabled={!drf.normalized_name || isSaving}
                                                                    className="h-8 px-3 bg-[#3182F6] text-white rounded-md text-xs font-bold transition-colors w-16 flex items-center justify-center"
                                                                >
                                                                    {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : '완료'}
                                                                </button>
                                                                <button onClick={() => {
                                                                    const newDrafts = { ...draftMappings };
                                                                    delete newDrafts[key];
                                                                    setDraftMappings(newDrafts);
                                                                }} className="text-xs text-gray-400 hover:text-gray-800 font-medium">취소</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr key={key} className="hover:bg-[#F9FAFB] transition-colors">
                                                    <td className="px-5 py-4 flex flex-col gap-1.5 items-start">
                                                        <div>{renderProviderBadge(m.provider)}</div>
                                                        <span className="font-semibold text-[#8B95A1] line-through decoration-1 whitespace-normal break-keep max-w-[200px]">{m.original_name}</span>
                                                    </td>
                                                    <td className="px-5 py-4 font-bold text-[#191F28]">{m.normalized_name}</td>
                                                    <td className="px-5 py-4 font-medium text-[#4E5968]">{m.custom_id || <span className="text-gray-300">-</span>}</td>
                                                    <td className="px-5 py-4">
                                                        {m.is_option
                                                            ? <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">기타 옵션</span>
                                                            : <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">메인 메뉴</span>
                                                        }
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            <button
                                                                className="text-gray-400 hover:text-[#3182F6] transition-colors p-1"
                                                                onClick={() => {
                                                                    updateDraft(m.provider, m.original_name, 'isEditing', true);
                                                                    updateDraft(m.provider, m.original_name, 'normalized_name', m.normalized_name);
                                                                    updateDraft(m.provider, m.original_name, 'custom_id', m.custom_id);
                                                                    updateDraft(m.provider, m.original_name, 'is_option', m.is_option);
                                                                }}
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <span className="text-[#8B95A1] text-[11px]">{m.updated_at ? formatDate(m.updated_at) : formatDate(m.created_at!)}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
