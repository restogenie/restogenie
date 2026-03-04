"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface StepOneProps {
    onNext: () => void;
}

export function StepOneConnector({ onNext }: StepOneProps) {
    const [vendor, setVendor] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleTestConnection = () => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setIsSuccess(true);
            setTimeout(() => {
                onNext();
            }, 1000);
        }, 1500);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto border-border shadow-sm">
            <CardHeader>
                <CardTitle className="text-2xl text-foreground font-bold">1단계: POS 커넥터 설정</CardTitle>
                <CardDescription className="text-muted-foreground">연동할 POS 브랜드를 선택하고 자격 증명을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="vendor">POS 브랜드 선택</Label>
                    <Select onValueChange={setVendor} value={vendor}>
                        <SelectTrigger id="vendor" className="w-full">
                            <SelectValue placeholder="POS 브랜드를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="toss">토스포스</SelectItem>
                            <SelectItem value="payhere">페이히어 (Payhere)</SelectItem>
                            <SelectItem value="smartro">스마트로</SelectItem>
                            <SelectItem value="okpos">OKPOS</SelectItem>
                            <SelectItem value="kicc">KICC</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {vendor === "payhere" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-2">
                            <Label htmlFor="api_key">API Key</Label>
                            <Input id="api_key" placeholder="페이히어 발급 API Key를 입력하세요" />
                        </div>
                    </div>
                )}

                {vendor === "okpos" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-2">
                            <Label htmlFor="asp_id">ASP 로그인 ID</Label>
                            <Input id="asp_id" placeholder="OKPOS ASP 계정 아이디" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="merchant_code">가맹점 코드</Label>
                            <Input id="merchant_code" placeholder="가맹점 코드 10자리" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input id="password" type="password" placeholder="비밀번호" />
                        </div>
                    </div>
                )}

                {vendor === "toss" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-2">
                            <Label htmlFor="token">인증 토큰</Label>
                            <Input id="token" placeholder="인증에 필요한 토큰을 입력하세요" />
                        </div>
                    </div>
                )}

                {vendor === "smartro" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-2">
                            <Label htmlFor="smartro_auth_key">인증키 (Auth Key)</Label>
                            <Input id="smartro_auth_key" placeholder="스마트로 API 인증키" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smartro_comp_no">사업자번호 (COMP_NO)</Label>
                            <Input id="smartro_comp_no" placeholder="예: 2208115014" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smartro_store_code">가맹점코드 (STORE_CODE)</Label>
                            <Input id="smartro_store_code" placeholder="예: 3900145" />
                        </div>
                    </div>
                )}

                {vendor === "kicc" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-2">
                            <Label htmlFor="hd_code">본부코드 (HD_CODE)</Label>
                            <Input id="hd_code" placeholder="예: J2H" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sp_code">매장코드 (SP_CODE)</Label>
                            <Input id="sp_code" placeholder="예: 000003" />
                        </div>
                    </div>
                )}

            </CardContent>
            <CardFooter className="flex justify-end pt-4 border-t border-secondary mt-4">
                <Button
                    onClick={handleTestConnection}
                    disabled={!vendor || isLoading || isSuccess}
                    className={`min-w-[140px] transition-all ${isSuccess ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSuccess ? '인증 성공! 이동 중...' : '연결 테스트'}
                </Button>
            </CardFooter>
        </Card>
    );
}
