"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface Props {
    formData: any;
    updateFormData: (data: any) => void;
    onSubmit: () => Promise<void>;
    onPrev: () => void;
}

export function Step3Terms({ formData, updateFormData, onSubmit, onPrev }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAllCheck = (checked: boolean) => {
        updateFormData({
            agreedTerms: checked,
            agreedPrivacy: checked,
            agreedMarketing: checked
        });
    };

    const isAllChecked = formData.agreedTerms && formData.agreedPrivacy && formData.agreedMarketing;

    const handleSubmit = async () => {
        if (!formData.agreedTerms || !formData.agreedPrivacy) {
            toast.error("필수 약관에 동의해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-full shadow-sm border-border animate-in fade-in slide-in-from-right-8 duration-300">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">약관 동의</CardTitle>
                <CardDescription>서비스 이용을 위한 중요 약관에 동의해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="flex items-center space-x-3 bg-secondary/30 p-4 rounded-lg border border-border">
                    <Checkbox
                        id="all"
                        checked={isAllChecked}
                        onCheckedChange={handleAllCheck}
                    />
                    <Label htmlFor="all" className="font-bold text-base cursor-pointer">
                        전체 동의하기
                    </Label>
                </div>

                <div className="space-y-4 pl-2">
                    <div className="flex flex-row items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="terms"
                                checked={formData.agreedTerms}
                                onCheckedChange={(c) => updateFormData({ agreedTerms: c })}
                            />
                            <Label htmlFor="terms" className="cursor-pointer text-sm">
                                [필수] 서비스 이용약관 동의
                            </Label>
                        </div>
                        <Link href="https://www.ctrl-m.co.kr/terms.html" target="_blank" className="text-xs text-blue-600 hover:underline">
                            내용보기
                        </Link>
                    </div>

                    <div className="flex flex-row items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="privacy"
                                checked={formData.agreedPrivacy}
                                onCheckedChange={(c) => updateFormData({ agreedPrivacy: c })}
                            />
                            <Label htmlFor="privacy" className="cursor-pointer text-sm">
                                [필수] 개인정보 처리방침 동의
                            </Label>
                        </div>
                        <Link href="https://www.ctrl-m.co.kr/privacy.html" target="_blank" className="text-xs text-blue-600 hover:underline">
                            내용보기
                        </Link>
                    </div>

                    <div className="flex flex-row items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="marketing"
                                checked={formData.agreedMarketing}
                                onCheckedChange={(c) => updateFormData({ agreedMarketing: c })}
                            />
                            <Label htmlFor="marketing" className="cursor-pointer text-sm">
                                [선택] 마케팅 정보 수신 동의 (전화/이메일/SMS/우편)
                            </Label>
                        </div>
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex justify-between pt-6 border-t border-secondary mt-2">
                <Button variant="outline" onClick={onPrev} disabled={isSubmitting}>
                    이전 단계
                </Button>
                <Button
                    onClick={handleSubmit}
                    className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 가입 처리중...</>
                    ) : "회원가입 완료"}
                </Button>
            </CardFooter>
        </Card>
    );
}
