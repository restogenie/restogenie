"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { CheckCircle2 } from "lucide-react";

interface Props {
    formData: any;
    updateFormData: (data: any) => void;
    onNext: () => void;
}

export function Step1PersonalInfo({ formData, updateFormData, onNext }: Props) {
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [showVerification, setShowVerification] = useState(false);

    const handleSendVerification = () => {
        if (!formData.phone || formData.phone.length < 10) {
            toast.error("유효한 휴대폰 번호를 입력해주세요.");
            return;
        }
        setShowVerification(true);
        toast.success("인증번호가 전송되었습니다. (테스트용: 123456)");
    };

    const handleVerify = () => {
        if (verificationCode === "123456") {
            setIsPhoneVerified(true);
            setShowVerification(false);
            toast.success("인증이 완료되었습니다.");
        } else {
            toast.error("잘못된 인증번호입니다.");
        }
    };

    const validateAndNext = () => {
        if (!formData.email || !formData.email.includes("@")) {
            toast.error("유효한 이메일을 입력해주세요.");
            return;
        }
        if (!formData.password || formData.password.length < 8) {
            toast.error("비밀번호는 8자 이상이어야 합니다.");
            return;
        }
        if (!formData.name) {
            toast.error("이름(대표자명)을 입력해주세요.");
            return;
        }
        if (!isPhoneVerified) {
            toast.error("휴대폰 본인인증을 완료해주세요.");
            return;
        }

        onNext();
    };

    return (
        <Card className="w-full shadow-sm border-border animate-in fade-in slide-in-from-right-8 duration-300">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">개인 정보 입력</CardTitle>
                <CardDescription>로그인 및 본인 확인에 사용할 개인 정보를 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email">이메일 (아이디)</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="example@restogenie.co.kr"
                        value={formData.email}
                        onChange={(e) => updateFormData({ email: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">비밀번호</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="8자 이상, 영문 대소문자/숫자/특수기호 포함"
                        value={formData.password}
                        onChange={(e) => updateFormData({ password: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">이름 (대표자 명)</Label>
                    <Input
                        id="name"
                        placeholder="실명을 입력해주세요"
                        value={formData.name}
                        onChange={(e) => updateFormData({ name: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">휴대전화번호</Label>
                    <div className="flex gap-2">
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="- 없이 숫자만 입력"
                            value={formData.phone}
                            onChange={(e) => updateFormData({ phone: e.target.value.replace(/[^0-9]/g, '') })}
                            disabled={isPhoneVerified}
                        />
                        <Button
                            type="button"
                            variant={isPhoneVerified ? "outline" : "secondary"}
                            onClick={handleSendVerification}
                            disabled={isPhoneVerified || !formData.phone}
                        >
                            {isPhoneVerified ? (
                                <><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> 인증완료</>
                            ) : "인증번호 발송"}
                        </Button>
                    </div>

                    {showVerification && !isPhoneVerified && (
                        <div className="flex gap-2 mt-2 animate-in slide-in-from-top-2">
                            <Input
                                placeholder="인증번호 6자리 입력"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                maxLength={6}
                            />
                            <Button type="button" onClick={handleVerify}>확인</Button>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-6 border-t border-secondary mt-2">
                <Button onClick={validateAndNext} className="min-w-[120px] bg-blue-600 hover:bg-blue-700">
                    다음 단계
                </Button>
            </CardFooter>
        </Card>
    );
}
