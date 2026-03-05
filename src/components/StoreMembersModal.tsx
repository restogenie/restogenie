"use client";

import { useState } from "react";
import { useStore } from "@/lib/StoreContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";
import axios from "axios";

interface StoreMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StoreMembersModal({ isOpen, onClose }: StoreMembersModalProps) {
    const { currentStore } = useStore();
    const [targetEmail, setTargetEmail] = useState("");
    const [role, setRole] = useState("STAFF");
    const [isLoading, setIsLoading] = useState(false);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentStore) return;

        setIsLoading(true);
        try {
            await axios.post("/api/v1/auth/invite", {
                store_id: currentStore.id.toString(),
                target_email: targetEmail,
                role: role
            });

            toast.success(`${targetEmail}님을 ${role} 권한으로 초대했습니다.`);
            setTargetEmail("");
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "직원 초대에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentStore) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>직원 관리 및 초대</DialogTitle>
                    <DialogDescription>
                        현재 사업장({currentStore.name})에 매니저나 일반 직원을 초대하여 접속 권한을 부여합니다.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4 pt-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#4E5968]">초대할 직원 이메일</label>
                            <Input
                                type="email"
                                placeholder="example@restogenie.co.kr"
                                value={targetEmail}
                                onChange={(e) => setTargetEmail(e.target.value)}
                                required
                            />
                            <p className="text-xs text-gray-500">※ RestoGenie에 가입된 이메일 계정이어야 합니다.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#4E5968]">부여할 권한 설정</label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="권한 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MANAGER">매니저 (조회 및 맵핑 기능 제한 없음)</SelectItem>
                                    <SelectItem value="STAFF">일반 직원 (상세 매출 지표 조회 제한)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            취소
                        </Button>
                        <Button type="submit" className="bg-[#3182F6] hover:bg-blue-700 text-white font-bold" disabled={isLoading}>
                            {isLoading ? "처리 중..." : "권한 초대 보내기"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
