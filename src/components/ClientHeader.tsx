"use client";

import { useStore } from "@/lib/StoreContext";
import { LogOut, Settings, User, Store as StoreIcon, KeyRound, Menu } from "lucide-react";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

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
                <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0">
                    R
                </div>
                <span className="font-bold text-lg tracking-tight mr-2 md:mr-6 hidden sm:block">RestoGenie</span>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-4 md:gap-6 sm:border-l border-[#F2F4F6] sm:pl-6 h-6 whitespace-nowrap">
                    <a href="/dashboard" className="text-sm font-bold text-[#191F28] hover:text-[#3182F6] transition-colors">대시보드</a>
                    <a href="/dashboard/analytics" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">심층 분석</a>
                    <a href="/dashboard/traffic" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">유동인구 분석</a>
                    <a href="/mapping" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">메뉴 맵핑</a>
                    <a href="/logs" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">시스템 로그</a>
                    <a href="/billing" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors hidden lg:block">구독 관리</a>
                </nav>

                {/* Mobile Hamburger Nav */}
                <Sheet>
                    <SheetTrigger className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md">
                        <Menu className="w-5 h-5" />
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[250px] sm:w-[300px] flex flex-col gap-6 pt-12">
                        <SheetTitle className="sr-only">모바일 메뉴</SheetTitle>
                        <nav className="flex flex-col gap-4">
                            <a href="/dashboard" className="text-base font-bold text-[#191F28] hover:text-[#3182F6] transition-colors">대시보드</a>
                            <a href="/dashboard/analytics" className="text-base font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">심층 분석</a>
                            <a href="/dashboard/traffic" className="text-base font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">유동인구 분석</a>
                            <a href="/mapping" className="text-base font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">메뉴 맵핑</a>
                            <a href="/logs" className="text-base font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">시스템 로그</a>
                            <a href="/billing" className="text-base font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">구독 관리</a>
                        </nav>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                {!isLoading && stores.length > 0 && (
                    <Select
                        value={currentStore?.id.toString()}
                        onValueChange={(val) => {
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
                            <SelectItem value="MANAGE_MEMBERS" className="text-gray-600 font-bold cursor-pointer">
                                👥 직원 및 권한 관리
                            </SelectItem>
                            <SelectItem value="ADD_NEW_STORE" className="text-blue-600 font-bold cursor-pointer">
                                ➕ 신규 사업장 추가
                            </SelectItem>
                        </SelectContent>
                    </Select>
                )}

                <a href="/setup" className="hidden md:flex flex-shrink-0 px-4 py-2 bg-[#191F28] text-white text-sm font-medium rounded-md hover:bg-[#333D4B] transition-colors shadow-sm">
                    + 신규 API 설정
                </a>

                <DropdownMenu>
                    <DropdownMenuTrigger className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors outline-none cursor-pointer" title="설정">
                        <Settings className="w-5 h-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mt-2 rounded-md shadow-lg border-[#E5E8EB]">
                        <DropdownMenuLabel className="font-semibold text-[#191F28] py-2">설정 및 메뉴</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-[#F2F4F6]" />
                        <DropdownMenuItem className="cursor-pointer py-2.5 hover:bg-[#F2F4F6]" onClick={() => router.push("/settings?tab=personal")}>
                            <User className="mr-3 h-4 w-4 text-blue-500" />
                            <span className="font-medium text-[#4E5968]">개인정보 관리</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer py-2.5 hover:bg-[#F2F4F6]" onClick={() => router.push("/settings?tab=business")}>
                            <StoreIcon className="mr-3 h-4 w-4 text-emerald-500" />
                            <span className="font-medium text-[#4E5968]">사업장 정보 관리</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer py-2.5 hover:bg-[#F2F4F6]" onClick={() => router.push("/settings?tab=connections")}>
                            <KeyRound className="mr-3 h-4 w-4 text-purple-500" />
                            <span className="font-medium text-[#4E5968]">API/POS 연결 설정</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[#F2F4F6]" />
                        <DropdownMenuItem className="cursor-pointer py-2.5 text-red-500 focus:text-red-600 focus:bg-red-50" onClick={handleLogout}>
                            <LogOut className="mr-3 h-4 w-4" />
                            <span className="font-medium">로그아웃</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <AddStoreModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            <StoreMembersModal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} />
        </header>
    );
}
