"use client";

import { useStore } from "@/lib/StoreContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useState } from "react";
import axios from "axios";

export default function BillingPage() {
    const { currentStore } = useStore();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubscribe = async () => {
        if (!currentStore) return;
        setIsLoading(true);

        try {
            // In a real scenario, this would trigger Toss Payments SDK or PortOne SDK 
            // modal to get a billing key. Here we mock a successful billing key acquisition.
            const mockBillingKey = `toss_bk_${Math.random().toString(36).substr(2, 9)}`;

            await axios.post("/api/v1/billing/subscribe", {
                store_id: currentStore.id.toString(),
                billing_key: mockBillingKey,
                // @ts-ignore
                customer_key: `cust_${currentStore.user_id}`
            });

            toast.success("결제 수단이 성공적으로 등록되었으며 구독이 활성화되었습니다!");
            window.location.reload(); // Refresh to catch updated store state
        } catch (error: any) {
            toast.error(error.response?.data?.message || "결제 수단 연동에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentStore) return null;

    // TypeScript fallback for new fields until StoreContext type is rebuilt
    const isActive = (currentStore as any).subscription_status === "ACTIVE";
    const expiration = (currentStore as any).subscription_end_date
        ? new Date((currentStore as any).subscription_end_date).toLocaleDateString()
        : "N/A";

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-[#191F28]">구독 및 결제 관리</h1>
                <p className="text-[#8B95A1] font-medium">RestoGenie SaaS 파이프라인 이용 요금 및 자동 결제 수단을 관리하세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            내 구독 상태
                            {isActive && <span className="px-2 py-0.5 mt-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">PRO</span>}
                        </CardTitle>
                        <CardDescription>현재 사업장: <strong>{currentStore.name}</strong></CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-gray-500 font-medium">이용 상태</span>
                                {isActive ? (
                                    <span className="font-bold flex items-center gap-1 text-green-600"><CheckCircle2 className="w-4 h-4" /> 활성 (구독 중)</span>
                                ) : (
                                    <span className="font-bold flex items-center gap-1 text-yellow-600"><AlertCircle className="w-4 h-4" /> 트라이얼 대기</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-gray-500 font-medium">다음 결제 예정일</span>
                                <span className="font-bold text-gray-800">{isActive ? expiration : "결제 수단 미등록"}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-gray-500 font-medium">월 청구 금액</span>
                                <span className="font-bold text-gray-800">₩ 29,900 <span className="text-xs text-gray-400 font-normal">/월 (VAT 포함)</span></span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-all duration-700 group-hover:bg-blue-500/10"></div>
                    <CardHeader>
                        <CardTitle>자동 결제 카드 등록</CardTitle>
                        <CardDescription>매월 결제일에 자동으로 과금되는 카드를 설정합니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        {isActive ? (
                            <div className="text-center space-y-4">
                                <div className="mx-auto w-16 h-16 bg-blue-50 flex items-center justify-center rounded-2xl mb-2">
                                    <CreditCard className="w-8 h-8 text-blue-600" />
                                </div>
                                <p className="font-bold text-[#191F28]">결제 수단이 등록되어 있습니다.</p>
                                <p className="text-sm text-gray-500">등록된 빌링키: ****-****-****-0341</p>
                            </div>
                        ) : (
                            <div className="text-center space-y-4">
                                <div className="mx-auto w-16 h-16 bg-gray-50 flex items-center justify-center rounded-2xl mb-2">
                                    <CreditCard className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="font-medium text-gray-500">아직 등록된 결제 수단이 없습니다.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        {!isActive ? (
                            <Button onClick={handleSubscribe} disabled={isLoading} className="w-full bg-[#3182F6] hover:bg-blue-700 text-white font-bold h-12 shadow-sm transition-all duration-300">
                                {isLoading ? "처리 중..." : "결제 카드 등록하고 시작하기"}
                            </Button>
                        ) : (
                            <Button variant="outline" className="w-full h-12 text-gray-600 font-medium border-gray-200">
                                결제 수단 변경하기
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
