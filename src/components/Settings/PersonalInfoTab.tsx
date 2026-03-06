"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Loader2, UserCircle, Save } from "lucide-react";

export default function PersonalInfoTab() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // User Form State
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // In a real scenario we'd query /api/v1/user/profile
                // For now, let's assume we fetch the current user's DB record
                const response = await fetch('/api/v1/user/profile');
                if (response.ok) {
                    const data = await response.json();
                    if (data.user) {
                        setName(data.user.name || "");
                        setEmail(data.user.email || "");
                        setPhone(data.user.phone || "");
                    }
                }
            } catch (e) {
                console.error("Failed to load profile", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/v1/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    phone,
                    password: password ? password : undefined
                })
            });

            if (res.ok) {
                toast.success("개인정보가 성공적으로 업데이트되었습니다.");
                setPassword(""); // Clear password field after save
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

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-[#191F28]">
                    <UserCircle className="w-5 h-5 text-blue-600" />
                    기본 계정 정보
                </h2>
                <p className="text-sm text-[#8B95A1] mt-1">로그인 및 알림 수신에 사용되는 계정 정보를 관리합니다.</p>
            </div>

            <div className="space-y-6 bg-white">
                <div className="grid gap-2">
                    <Label htmlFor="email" className="text-[#333D4B] font-semibold">이메일 (아이디)</Label>
                    <Input
                        id="email"
                        value={email}
                        disabled
                        className="bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed border-[#E5E8EB]"
                    />
                    <p className="text-xs text-[#8B95A1]">이메일은 변경할 수 없습니다.</p>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="name" className="text-[#333D4B] font-semibold">이름 (대표자 명)</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-[#E5E8EB] focus-visible:ring-blue-500"
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-[#333D4B] font-semibold">휴대전화번호</Label>
                    <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="border-[#E5E8EB] focus-visible:ring-blue-500"
                        placeholder="- 없이 숫자만 입력"
                    />
                </div>

                <div className="grid gap-2 pt-4 border-t border-[#F2F4F6]">
                    <Label htmlFor="password" className="text-[#333D4B] font-semibold">새 비밀번호</Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-[#E5E8EB] focus-visible:ring-blue-500"
                        placeholder="변경을 원할 경우에만 입력하세요 (8자 이상)"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !name || !phone}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] shadow-sm font-semibold"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    변경사항 저장
                </Button>
            </div>
        </div>
    );
}
