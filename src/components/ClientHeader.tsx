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

export function ClientHeader() {
    const { stores, currentStore, setCurrentStore, isLoading } = useStore();
    const router = useRouter();

    const handleLogout = () => {
        document.cookie = "admin_token=; path=/; max-age=0;";
        toast.success("로그아웃 되었습니다.");
        router.push("/login");
        router.refresh();
    };

    return (
        <header className="fixed top-0 w-full h-16 bg-white/80 backdrop-blur-md border-b border-[#F2F4F6] z-50 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
                    R
                </div>
                <span className="font-bold text-lg tracking-tight mr-6">RestoGenie</span>
                <nav className="flex items-center gap-6 border-l border-[#F2F4F6] pl-6 h-6">
                    <a href="/dashboard" className="text-sm font-bold text-[#191F28] hover:text-[#3182F6] transition-colors">매출 대시보드</a>
                    <a href="/mapping" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">메뉴 맵핑</a>
                    <a href="/logs" className="text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors">시스템 로그</a>
                </nav>
            </div>

            <div className="flex items-center gap-4">
                {!isLoading && stores.length > 0 && (
                    <Select
                        value={currentStore?.id.toString() || ""}
                        onValueChange={(val) => {
                            const selected = stores.find(s => s.id.toString() === val);
                            if (selected) setCurrentStore(selected);
                        }}
                    >
                        <SelectTrigger className="w-[180px] h-9 border-[#E5E8EB] bg-[#F9FAFB] font-medium text-sm">
                            <SelectValue placeholder="사업장 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {stores.map(store => (
                                <SelectItem key={store.id} value={store.id.toString()}>
                                    {store.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <a href="/setup" className="px-4 py-2 bg-[#191F28] text-white text-sm font-medium rounded-lg hover:bg-[#333D4B] transition-colors shadow-sm">
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
        </header>
    );
}
