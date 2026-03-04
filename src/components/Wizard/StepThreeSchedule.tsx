"use client";

import React, { useState } from 'react';
import { Calendar, Clock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface StepThreeProps {
    onPrev: () => void;
    onComplete: () => void;
    posType?: string; // e.g. 'payhere' | 'easypos'
}

export function StepThreeSchedule({ onPrev, onComplete, posType = 'payhere' }: StepThreeProps) {
    const router = useRouter();
    const [frequency, setFrequency] = useState('daily');
    const [time, setTime] = useState('02:00');
    const [historyRange, setHistoryRange] = useState('1_month');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleManualSync = async () => {
        setIsSyncing(true);
        setSyncStatus('idle');
        try {
            // For history, ideally iterate over dates.
            // Get JWT token from cookies
            const token = document.cookie
                .split("; ")
                .find((row) => row.startsWith("admin_token="))
                ?.split("=")[1];

            if (!token) {
                throw new Error("Missing authentication token. Please login again.");
            }

            // The original code was designed for a single posType.
            // The provided snippet seems to be for multiple systems, but 'data.targetPosSystems' is not defined here.
            // Adapting the change to fit the existing single posType logic using fetch.
            const endpoint = posType.toLowerCase() === 'easypos' ? 'easypos' : 'payhere'; // Just the system name for the URL
            await fetch(`/api/v1/sync/${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({})
            });
            setSyncStatus('success');
            toast.success(`${posType === 'easypos' ? '이지포스' : '페이히어'} 동기화가 완료되었습니다!`);
            setTimeout(() => {
                setIsSyncing(false);
                router.push('/dashboard');
            }, 1500);
        } catch (error: any) {
            console.error("Sync Failed:", error);
            toast.error(error.message || "동기화에 실패했습니다. 관리자에게 문의하세요.");
            setSyncStatus('error');
            setIsSyncing(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto border-border shadow-sm">
            <CardHeader>
                <CardTitle className="text-2xl text-foreground font-bold">3단계: 파이프라인 스케줄링</CardTitle>
                <CardDescription className="text-muted-foreground">자동 동기화 주기 및 과거 데이터 수집 범위를 설정하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="sync_freq">동기화 주기</Label>
                    <Select defaultValue={frequency} onValueChange={setFrequency}>
                        <SelectTrigger id="sync_freq" className="w-full">
                            <SelectValue placeholder="주기를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">매일</SelectItem>
                            <SelectItem value="weekly">매주</SelectItem>
                            <SelectItem value="monthly">매월</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">AWS EventBridge를 통해 지정된 주기로 백그라운드 수집이 실행됩니다.</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sync_time">동기화 시간</Label>
                    <Select defaultValue={time} onValueChange={setTime}>
                        <SelectTrigger id="sync_time" className="w-full">
                            <SelectValue placeholder="시간을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="00:00">오전 12시 (자정)</SelectItem>
                            <SelectItem value="02:00">오전 2시</SelectItem>
                            <SelectItem value="04:00">오전 4시</SelectItem>
                            <SelectItem value="06:00">오전 6시</SelectItem>
                            <SelectItem value="08:00">오전 8시</SelectItem>
                            <SelectItem value="10:00">오전 10시</SelectItem>
                            <SelectItem value="12:00">오후 12시 (정오)</SelectItem>
                            <SelectItem value="14:00">오후 2시</SelectItem>
                            <SelectItem value="16:00">오후 4시</SelectItem>
                            <SelectItem value="18:00">오후 6시</SelectItem>
                            <SelectItem value="20:00">오후 8시</SelectItem>
                            <SelectItem value="22:00">오후 10시</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="history_range">과거 데이터 연동 시작일</Label>
                    <Select defaultValue={historyRange} onValueChange={setHistoryRange}>
                        <SelectTrigger id="history_range" className="w-full">
                            <SelectValue placeholder="시작 범위를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0_day">연동 시점부터 (과거데이터 없음)</SelectItem>
                            <SelectItem value="1_week">최근 1주</SelectItem>
                            <SelectItem value="1_month">최근 1개월</SelectItem>
                            <SelectItem value="3_month">최근 3개월</SelectItem>
                            <SelectItem value="6_month">최근 6개월</SelectItem>
                            <SelectItem value="1_year">최근 1년</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-4 border-t border-secondary mt-4">
                <Button variant="outline" onClick={onPrev} disabled={isSyncing}>이전 단계</Button>
                <button
                    onClick={handleManualSync}
                    disabled={isSyncing || syncStatus === 'success'}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-all shadow-md
            ${syncStatus === 'success'
                            ? 'bg-[#00C471] hover:bg-[#00C471]'
                            : syncStatus === 'error'
                                ? 'bg-[#E53935] hover:bg-[#D32F2F]'
                                : 'bg-[#3182F6] hover:bg-[#1B64DA] hover:-translate-y-0.5'
                        }
            disabled:opacity-70 disabled:hover:translate-y-0
          `}
                >
                    {isSyncing ? (
                        <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            동기화 진행 중...
                        </>
                    ) : syncStatus === 'success' ? (
                        <>
                            <CheckCircle2 className="w-5 h-5" />
                            동기화 완료! (대시보드 이동)
                        </>
                    ) : syncStatus === 'error' ? (
                        <>
                            <AlertCircle className="w-5 h-5" />
                            동기화 실패 (재시도)
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-5 h-5" />
                            즉시 1회 동기화 및 설정 완료
                        </>
                    )}
                </button>
            </CardFooter>
        </Card>
    );
}
