"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Loader2, KeyRound, AlertCircle, RefreshCw, Trash2, Unplug } from "lucide-react";
import { useStore } from "@/lib/StoreContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function PosConnectionsTab() {
    const { currentStore } = useStore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [connections, setConnections] = useState<any[]>([]);

    useEffect(() => {
        const fetchConnections = async () => {
            if (!currentStore) return;
            setIsLoading(true);
            try {
                const [posRes, cctvRes] = await Promise.all([
                    fetch(`/api/v1/business/connection?store_id=${currentStore.id}`),
                    fetch(`/api/v1/business/cctv?store_id=${currentStore.id}`)
                ]);

                let allConnections: any[] = [];
                
                if (posRes.ok) {
                    const data = await posRes.json();
                    allConnections = allConnections.concat(data.connections || []);
                }
                
                if (cctvRes.ok) {
                    const data = await cctvRes.json();
                    const cctvConnections = (data.connections || []).map((c: any) => ({
                        ...c,
                        vendor: 'mayi',
                        auth_code_1: 'SYSTEM_LINKED',
                        auth_code_2: null,
                        auth_code_3: null
                    }));
                    allConnections = allConnections.concat(cctvConnections);
                }

                setConnections(allConnections);
            } catch (e) {
                console.error("Failed to load connections", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConnections();
    }, [currentStore]);

    const handleDeleteConnection = async (id: number, vendor: string) => {
        if (!confirm(`정말로 ${vendor} 연동을 해제하시겠습니까? 연결된 API 자격 증명이 완전히 삭제되며 복구할 수 없습니다.`)) return;

        try {
            const deleteUrl = vendor === 'mayi' 
                ? `/api/v1/business/cctv?store_id=${currentStore?.id}`
                : `/api/v1/business/connection?id=${id}&store_id=${currentStore?.id}`;
                
            const res = await fetch(deleteUrl, { method: "DELETE" });
            if (res.ok) {
                toast.success(`${vendor} 연동이 해제되었습니다.`);
                setConnections(prev => prev.filter(c => c.id !== id));
            } else {
                toast.error("항목 삭제 중 오류가 발생했습니다.");
            }
        } catch (e) {
            toast.error("네트워크 오류");
        }
    };

    if (!currentStore) {
        return <div className="p-10 text-center text-gray-500">사업장을 먼저 선택해주세요.</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-[#191F28]">
                        <KeyRound className="w-5 h-5 text-blue-600" />
                        POS 커넥터 관리
                    </h2>
                    <p className="text-sm text-[#8B95A1] mt-1">[{currentStore.name}] 사업장에 연결된 POS 및 배달앱 API 증명을 관리합니다.</p>
                </div>
                <Button
                    variant="outline"
                    className="flex text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                    onClick={() => router.push("/setup")}
                >
                    + 신규 연동 추가
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center flex-col items-center py-20 gap-4 border border-[#E5E8EB] rounded-md bg-[#F9FAFB]">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-sm text-gray-500">연동 내역을 불러오는 중...</p>
                </div>
            ) : connections.length === 0 ? (
                <div className="flex justify-center flex-col items-center py-20 gap-4 border border-[#E5E8EB] rounded-md bg-[#F9FAFB] border-dashed">
                    <Unplug className="w-10 h-10 text-gray-300" />
                    <p className="font-semibold text-[#333D4B]">연동된 POS 자격 증명이 없습니다.</p>
                    <p className="text-sm text-[#8B95A1]">우측 상단의 "신규 연동 추가" 버튼을 눌러 연동을 시작하세요.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connections.map((conn) => (
                        <Card key={conn.id} className="shadow-sm border-[#E5E8EB]">
                            <CardHeader className="pb-3 border-b border-[#F2F4F6]">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="uppercase text-[#191F28]">{conn.vendor}</span>
                                    </CardTitle>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                                        {conn.sync_status === 'Finished' ? '연동 완료' : conn.sync_status || '활성'}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    생성일: {new Date(conn.created_at).toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="bg-[#F9FAFB] p-3 rounded-md border border-[#E5E8EB] space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#8B95A1] font-medium">Auth Key 1</span>
                                        <span className="font-mono text-[#333D4B] truncate w-[150px] text-right">
                                            {conn.auth_code_1 ? '*'.repeat(8) + conn.auth_code_1.slice(-4) : '없음'}
                                        </span>
                                    </div>
                                    {(conn.auth_code_2 || conn.vendor === 'smartro' || conn.vendor === 'easypos') && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[#8B95A1] font-medium">Auth Key 2</span>
                                            <span className="font-mono text-[#333D4B] truncate w-[150px] text-right">
                                                {conn.auth_code_2 ? '*'.repeat(4) + conn.auth_code_2.slice(-4) : '없음'}
                                            </span>
                                        </div>
                                    )}
                                    {(conn.auth_code_3 || conn.vendor === 'smartro') && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[#8B95A1] font-medium">Auth Key 3</span>
                                            <span className="font-mono text-[#333D4B] truncate w-[150px] text-right">
                                                {conn.auth_code_3 || '없음'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDeleteConnection(conn.id, conn.vendor)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        연동 해제 및 삭제
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
