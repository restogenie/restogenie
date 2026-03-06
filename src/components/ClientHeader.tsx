"use client";

import { useStore } from "@/lib/StoreContext";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { useState } from "react";
import { AddStoreModal } from "./AddStoreModal";
import { StoreMembersModal } from "./StoreMembersModal";

export function ClientHeader() {
    const { stores, currentStore, setCurrentStore, isLoading } = useStore();
    const router = useRouter();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

    const handleLogout = () => {
        document.cookie = "admin_token=; path=/; max-age=0;";
        toast.success("로그아웃 되었습니다.");
        router.push("/login");
        router.refresh();
    };

    return (
        <header className="fixed top-0 w-full h-16 bg-white/80 backdrop-blur-md border-b border-[#F2F4F6] z-50 px-4 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0">
                    R
                </div>
                <span className="font-bold text-lg tracking-tight mr-2 md:mr-6 hidden sm:block">RestoGenie</span>
                <nav className="flex items-center gap-4 md:gap-6 sm:border-l border-[#F2F4F6] sm:pl-6 h-6 overflow-x-auto custom-scrollbar no-scrollbar whitespace-nowrap mask-linear-fade">
                    <a href="/dashboard" className="text-sm font-bold text-[#191F28] hover:text-[#3182F6] transition-colors">대시보드</a>
                    <a href="/dashboard/analytics" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors hidden md:block">심층 분석</a>
                    <a href="/mapping" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">메뉴 맵핑</a>
                    <a href="/logs" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors hidden sm:block">시스템 로그</a>
                    <a href="/billing" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors hidden lg:block">구독 관리</a>
                </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                {!isLoading && stores.length > 0 && (
                    <Select
                        value={currentStore?.id.toString()}
                        onValueChange={(val) => {
                            if (val === "GO_SETTINGS") {
                                router.push("/settings");
                                return;
                            }
                            if (val === "ADD_NEW_STORE") {
                                setIsAddModalOpen(true);
                                return;
                            }
                            if (val === "MANAGE_MEMBERS") {
                                setIsMembersModalOpen(true);
                                return;
                            }
                            const selected = stores.find(s => s.id.toString() === val);
                            if (selected) setCurrentStore(selected);
                        }}
                    >
                        <SelectTrigger className="w-[130px] md:w-[180px] h-9 border-[#E5E8EB] bg-[#F9FAFB] font-medium text-xs md:text-sm truncate">
                            <SelectValue placeholder="사업장 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {stores.map(store => (
                                <SelectItem key={store.id} value={store.id.toString()}>
                                    {store.name}
                                </SelectItem>
                            ))}
                            <SelectItem value="GO_SETTINGS" className="text-gray-800 font-bold border-t border-gray-100 mt-1 cursor-pointer">
                                ⚙️ 설정 및 관리
                            </SelectItem>
                            <SelectItem value="MANAGE_MEMBERS" className="text-gray-600 font-bold cursor-pointer">
                                👥 직원 및 권한 관리
                            </SelectItem>
                            <SelectItem value="ADD_NEW_STORE" className="text-blue-600 font-bold cursor-pointer">
                                ➕ 신규 사업장 추가
                            </SelectItem>
                        </SelectContent>
                    </Select>
                )}

                <a href="/setup" className="hidden md:flex flex-shrink-0 px-4 py-2 bg-[#191F28] text-white text-sm font-medium rounded-lg hover:bg-[#333D4B] transition-colors shadow-sm">
                    + 신규 API 설정
                </a>

                <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="로그아웃"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>

            <AddStoreModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            <StoreMembersModal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} />
        </header>
    );
}
