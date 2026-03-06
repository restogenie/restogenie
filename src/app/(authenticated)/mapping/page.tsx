"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Save, Store, Edit2, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DateTime } from 'luxon';
import { useStore } from '@/lib/StoreContext';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Mapping {
    id: number;
    provider: string;
    original_name: string;
    normalized_name: string;
    created_at: string;
    updated_at: string;
}

export default function MappingPage() {
    const { currentStore } = useStore();
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [suggestingAI, setSuggestingAI] = useState(false);

    // Form State
    const [provider, setProvider] = useState('payhere');
    const [originalName, setOriginalName] = useState('');
    const [normalizedName, setNormalizedName] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchMappings = async (isRefresh = false) => {
        if (!currentStore) return;
        try {
            if (isRefresh) setRefreshing(true);
            const token = document.cookie.split("; ").find((row) => row.startsWith("admin_token="))?.split("=")[1];

            if (!token) {
                window.location.href = '/login';
                return;
            }

            const res = await axios.get(`/api/v1/sync/mapping?store_id=${currentStore.id}&limit=500`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                setMappings(res.data.data);
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
        }
    }, [currentStore]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!originalName || !normalizedName) return;

        setSaving(true);
        try {
            const token = document.cookie.split("; ").find((row) => row.startsWith("admin_token="))?.split("=")[1];
            await axios.post(`/api/v1/sync/mapping`, {
                store_id: currentStore?.id,
                provider,
                original_name: originalName,
                normalized_name: normalizedName
            }, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            // Re-fetch
            toast.success("맵핑 규칙이 저장되었습니다.");
            fetchMappings(true);
            setOriginalName('');
            setNormalizedName('');
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "저장에 실패했습니다.");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleAISuggest = async () => {
        if (!currentStore) return;
        setSuggestingAI(true);
        const loadingToast = toast.loading("✨ AI가 미분류 메뉴를 스캔하고 최적의 이름으로 자동 매핑 중입니다...", { duration: 15000 });

        try {
            const token = document.cookie.split("; ").find((row) => row.startsWith("admin_token="))?.split("=")[1];
            const res = await axios.post(`/api/v1/mapping/ai-suggest`, {
                store_id: currentStore.id
            }, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.data?.status === 'success') {
                if (res.data.count > 0) {
                    toast.success(res.data.message, { id: loadingToast, duration: 4000 });
                    fetchMappings(true);
                } else {
                    toast.success(res.data.message || "매핑할 신규 항목이 없습니다.", { id: loadingToast, icon: "✨" });
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "AI 자동 매핑에 실패했습니다. (Gemini API 키를 확인해주세요)", { id: loadingToast });
            console.error(err);
        } finally {
            setSuggestingAI(false);
        }
    };

    const formatDate = (isoStr: string) => {
        if (!isoStr) return '-';
        return DateTime.fromISO(isoStr).toFormat('yyyy.MM.dd');
    };

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#191F28] mb-2">메뉴명 정규화 (Mapping)</h1>
                    <p className="text-[#8B95A1] font-medium">포스사마다 다른 원본 상품명을 하나의 이름으로 통합 관리하세요.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleAISuggest}
                        disabled={suggestingAI}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-600 rounded-xl font-bold hover:from-indigo-100 hover:to-purple-100 transition-all shadow-sm disabled:opacity-50"
                    >
                        <Sparkles className={cn("w-4 h-4", suggestingAI && "animate-pulse")} />
                        ✨ AI 자동 맵핑 추천
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-6 space-y-6">
                        <h3 className="text-lg font-bold text-[#191F28] flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-[#3182F6]" /> 맵핑 규칙 추가
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#4E5968] mb-2">포스사 선택</label>
                                <select
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] text-[#191F28] focus:border-[#3182F6] focus:bg-white focus:ring-1 focus:ring-[#3182F6] transition-colors outline-none appearance-none font-medium"
                                >
                                    <option value="payhere">페이히어 (Payhere)</option>
                                    <option value="easypos">이지포스 (Easypos)</option>
                                    <option value="smartro">스마트로 (Smartro)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#4E5968] mb-2">원본 상품명 (POS에 등록된 이름)</label>
                                <input
                                    type="text"
                                    required
                                    value={originalName}
                                    onChange={(e) => setOriginalName(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] text-[#191F28] focus:border-[#3182F6] focus:bg-white focus:ring-1 focus:ring-[#3182F6] transition-colors outline-none font-medium"
                                    placeholder="예: 클래식버거(세트)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#4E5968] mb-2">정규화 상품명 (통합할 마스터 이름)</label>
                                <input
                                    type="text"
                                    required
                                    value={normalizedName}
                                    onChange={(e) => setNormalizedName(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB] text-[#191F28] focus:border-[#3182F6] focus:bg-white focus:ring-1 focus:ring-[#3182F6] transition-colors outline-none font-medium"
                                    placeholder="예: 클래식버거"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full h-12 bg-[#3182F6] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1B64DA] transition-colors disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            저장하기
                        </button>
                    </form>
                </div>

                {/* Table Section */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#F2F4F6] overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-[#F2F4F6] bg-[#F9FAFB]">
                        <h3 className="text-sm font-bold text-[#4E5968]">등록된 맵핑 규칙 ({mappings.length}개)</h3>
                    </div>

                    {loading ? (
                        <div className="p-12 flex items-center justify-center flex-1">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3182F6]"></div>
                        </div>
                    ) : mappings.length === 0 ? (
                        <div className="p-16 text-center text-[#8B95A1] flex-1">
                            <Store className="w-12 h-12 mx-auto text-[#E5E8EB] mb-4" />
                            <p className="mb-2 font-medium">등록된 메뉴 맵핑이 없습니다.</p>
                            <p className="text-sm">좌측 폼을 이용해 새로운 규칙을 추가해주세요.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-[#F2F4F6]">
                                        <th className="px-6 py-4 text-xs font-semibold text-[#8B95A1] uppercase tracking-wider">포스사</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[#8B95A1] uppercase tracking-wider">원본 상품명</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[#8B95A1] uppercase tracking-wider">정규화 상품명</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-[#8B95A1] uppercase tracking-wider text-right">수정일</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F2F4F6]">
                                    {mappings.map((m) => (
                                        <tr key={m.id} className="hover:bg-[#F9FAFB] transition-colors">
                                            <td className="px-6 py-4">
                                                {m.provider === 'payhere' ? (
                                                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-[#E8F8EE] text-[#00C471]">페이히어</span>
                                                ) : m.provider === 'smartro' ? (
                                                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-[#E8F8EE] text-[#3182F6]">스마트로</span>
                                                ) : (
                                                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF4E5] text-[#F9A825]">이지포스</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-[#8B95A1] line-through decoration-1">{m.original_name}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-[#191F28]">{m.normalized_name}</td>
                                            <td className="px-6 py-4 text-sm text-[#4E5968] text-right">{formatDate(m.updated_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
