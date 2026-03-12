"use client";

import { useStore } from "@/lib/StoreContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Store, KeyRound, Loader2 } from "lucide-react";
import PersonalInfoTab from "@/components/Settings/PersonalInfoTab";
import BusinessInfoTab from "@/components/Settings/BusinessInfoTab";
import PosConnectionsTab from "@/components/Settings/PosConnectionsTab";
import AiKeysTab from "@/components/Settings/AiKeysTab";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function SettingsTabsContent() {
    const { currentStore } = useStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState("personal");

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab && ["personal", "business", "connections", "ai-keys"].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        router.push(`/settings?tab=${value}`, { scroll: false });
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#191F28]">설정 및 관리</h1>
                <p className="text-[#8B95A1] mt-2">
                    개인 계정 정보, {currentStore ? `[${currentStore.name}]` : "사업장"}의 상세 정보 및 POS 연동 내역을 관리합니다.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4 bg-[#F2F4F6] p-1 rounded-md">
                    <TabsTrigger value="personal" className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:text-[#191F28] data-[state=active]:shadow-sm transition-all py-2.5">
                        <User className="w-4 h-4" />
                        <span className="font-semibold text-sm">개인정보 관리</span>
                    </TabsTrigger>
                    <TabsTrigger value="business" className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:text-[#191F28] data-[state=active]:shadow-sm transition-all py-2.5">
                        <Store className="w-4 h-4" />
                        <span className="font-semibold text-sm">사업장 정보 관리</span>
                    </TabsTrigger>
                    <TabsTrigger value="connections" className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:text-[#191F28] data-[state=active]:shadow-sm transition-all py-2.5">
                        <KeyRound className="w-4 h-4" />
                        <span className="font-semibold text-sm hidden sm:inline">POS 커넥터</span>
                    </TabsTrigger>
                    <TabsTrigger value="ai-keys" className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:text-[#191F28] data-[state=active]:shadow-sm transition-all py-2.5">
                        <User className="w-4 h-4 text-indigo-500" />
                        <span className="font-semibold text-sm hidden sm:inline">AI Keys 관리</span>
                    </TabsTrigger>
                </TabsList>

                <div className="bg-white border border-[#E5E8EB] rounded-md p-6 md:p-8 shadow-sm">
                    <TabsContent value="personal" className="mt-0 focus-visible:outline-none">
                        <PersonalInfoTab />
                    </TabsContent>

                    <TabsContent value="business" className="mt-0 focus-visible:outline-none">
                        <BusinessInfoTab />
                    </TabsContent>

                    <TabsContent value="connections" className="mt-0 focus-visible:outline-none">
                        <PosConnectionsTab />
                    </TabsContent>

                    <TabsContent value="ai-keys" className="mt-0 focus-visible:outline-none">
                        <AiKeysTab />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        }>
            <SettingsTabsContent />
        </Suspense>
    );
}
