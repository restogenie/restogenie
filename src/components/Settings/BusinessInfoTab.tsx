"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Loader2, Store, Save } from "lucide-react";
import { useStore } from "@/lib/StoreContext";

export default function BusinessInfoTab() {
    const { currentStore, setCurrentStore } = useStore();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [businessNumber, setBusinessNumber] = useState("");
    const [businessCondition, setBusinessCondition] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [openingDate, setOpeningDate] = useState("");
    const [phone, setPhone] = useState("");

    useEffect(() => {
        if (!currentStore) return;

        // Populate local state from global context
        setName(currentStore.name || "");
        setBusinessNumber(currentStore.business_number || "");
        setBusinessCondition(currentStore.business_condition || "");
        setBusinessType(currentStore.business_type || "");
        setOpeningDate(currentStore.opening_date || "");
        setPhone(currentStore.phone || "");
        setIsLoading(false);
    }, [currentStore]);

    const handleSave = async () => {
        if (!currentStore) return;
        setIsSaving(true);

        try {
            const res = await fetch(`/api/v1/business/stores`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    store_id: currentStore.id,
                    name,
                    business_number: businessNumber,
                    business_condition: businessCondition,
                    business_type: businessType,
                    opening_date: openingDate,
                    phone
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success("사업장 정보가 성공적으로 업데이트되었습니다.");
                // Update global context
                setCurrentStore(data.store);
            } else {
                const err = await res.json();
                toast.error(`업데이트 실패: ${err.message || '알 수 없는 오류'}`);
            }
        } catch (e) {
            toast.error("네트워크 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !currentStore) {
        return (
            <div className="flex justify-center flex-col items-center py-20 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">사업장 정보를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-[#191F28]">
                    <Store className="w-5 h-5 text-blue-600" />
                    사업장 정보 관리
                </h2>
                <p className="text-sm text-[#8B95A1] mt-1">[{currentStore.name}] 사업장의 사업자 등록 정보 및 매장 세부 정보를 관리합니다.</p>
            </div>

            <div className="space-y-6 bg-white">
                <div className="grid gap-2">
                    <Label htmlFor="store_name" className="text-[#333D4B] font-semibold">상호명 (매장명)</Label>
                    <Input
                        id="store_name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-[#E5E8EB] focus-visible:ring-blue-500"
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="biz_num" className="text-[#333D4B] font-semibold">사업자 등록번호</Label>
                    <Input
                        id="biz_num"
                        value={businessNumber}
                        disabled
                        className="bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed border-[#E5E8EB]"
                        placeholder="- 없이 10자리 입력"
                    />
                    <p className="text-xs text-[#8B95A1]">사업자 번호는 변경할 수 없습니다. 신규 추가를 이용해주세요.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="biz_condition" className="text-[#333D4B] font-semibold">업태</Label>
                        <Input
                            id="biz_condition"
                            value={businessCondition}
                            onChange={(e) => setBusinessCondition(e.target.value)}
                            className="border-[#E5E8EB] focus-visible:ring-blue-500"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="biz_type" className="text-[#333D4B] font-semibold">업종 / 종목</Label>
                        <Input
                            id="biz_type"
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value)}
                            className="border-[#E5E8EB] focus-visible:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="open_date" className="text-[#333D4B] font-semibold">개업일자</Label>
                        <Input
                            id="open_date"
                            value={openingDate}
                            onChange={(e) => setOpeningDate(e.target.value)}
                            placeholder="YYYYMMDD"
                            className="border-[#E5E8EB] focus-visible:ring-blue-500"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="store_phone" className="text-[#333D4B] font-semibold">매장 전화번호</Label>
                        <Input
                            id="store_phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="- 없이 숫자만 입력"
                            className="border-[#E5E8EB] focus-visible:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !name}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] shadow-sm font-semibold"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    변경사항 저장
                </Button>
            </div>
        </div>
    );
}
