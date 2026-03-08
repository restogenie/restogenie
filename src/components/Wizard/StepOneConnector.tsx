"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Terminal } from "lucide-react";
import { useStore } from "@/lib/StoreContext";
import toast from "react-hot-toast";
import axios from "axios";

interface StepOneProps {
    onNext: (vendor?: string) => void;
}

export function StepOneConnector({ onNext }: StepOneProps) {
    const { currentStore } = useStore();

    // Form States
    const [vendor, setVendor] = useState("");
    const [authCode1, setAuthCode1] = useState("");
    const [authCode2, setAuthCode2] = useState("");
    const [authCode3, setAuthCode3] = useState("");

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Terminal Logs State
    const [logs, setLogs] = useState<{ time: string, message: string, level: string }[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Auto scroll terminal
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Clear interval on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, []);

    const fetchLogs = async () => {
        if (!currentStore) return;
        try {
            const res = await axios.get(`/api/v1/system/logs?store_id=${currentStore.id}&limit=10`);
            const fetchedLogs = res.data.logs.map((log: any) => ({
                time: new Date(log.created_at).toLocaleTimeString([], { hour12: false }),
                message: log.message,
                level: log.level
            })).reverse();
            setLogs(fetchedLogs);
        } catch (e) {
            console.error("Failed to poll logs", e);
        }
    };

    const handleTestConnection = async () => {
        if (!currentStore) {
            toast.error("선택된 사업장이 없습니다. 새로고침 후 다시 시도해주세요.");
            return;
        }

        setIsLoading(true);
        setLogs([]);

        let payloadAuth1 = authCode1;
        let payloadAuth2 = authCode2;
        let payloadAuth3 = authCode3;

        try {
            // 1. Save Connection
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString([], { hour12: false }), message: "Connecting to database to save POS credentials...", level: "INFO" }]);

            await axios.post("/api/v1/business/connection", {
                store_id: currentStore.id,
                vendor: vendor,
                auth_code_1: payloadAuth1,
                auth_code_2: payloadAuth2,
                auth_code_3: payloadAuth3,
            });

            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString([], { hour12: false }), message: `Successfully saved ${vendor} credentials for Store ID: ${currentStore.id}.`, level: "INFO" }]);
            if (["baemin", "coupangeats", "yogiyo"].includes(vendor)) {
                // Background Sync Path: Exit early and let dashboard monitor 'sync_status'
                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString([], { hour12: false }), message: "Background crawling task deployed safely. Tracking sync status asynchronously.", level: "INFO" }]);
                setIsSuccess(true);
                toast.success(`${vendor} 연동이 백그라운드에서 시작되었습니다. 대시보드에서 상태를 확인하세요.`);
                setTimeout(() => onNext(vendor), 2500);
            } else {
                // Real-time API Sync Path
                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString([], { hour12: false }), message: "Initiating 30-day historical data synchronization pipeline...", level: "INFO" }]);
                pollingIntervalRef.current = setInterval(fetchLogs, 1500);

                await axios.post(`/api/v1/sync/${vendor}`, {
                    store_id: currentStore.id,
                    days_to_sync: 30
                });

                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                await fetchLogs();

                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString([], { hour12: false }), message: "Pipeline execution completed successfully. Ready to proceed.", level: "INFO" }]);
                setIsSuccess(true);
                toast.success("초기 동기화가 완료되었습니다.");

                setTimeout(() => onNext(vendor), 2000);
            }

        } catch (error: any) {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            const errMessage = error.response?.data?.message || error.response?.data?.detail || error.message;
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString([], { hour12: false }), message: `Execution failed: ${errMessage}`, level: "ERROR" }]);
            toast.error(`동기화 실패: ${errMessage}`);
            setIsLoading(false);
        }
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
                    <Select onValueChange={(val) => { setVendor(val); setAuthCode1(""); setAuthCode2(""); setAuthCode3(""); }} value={vendor} disabled={isLoading || isSuccess}>
                        <SelectTrigger id="vendor" className="w-full">
                            <SelectValue placeholder="POS 브랜드를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="payhere">페이히어 (Payhere)</SelectItem>
                            <SelectItem value="smartro">스마트로 (Smartro)</SelectItem>
                            <SelectItem value="easypos">이지포스 (Easypos / KICC)</SelectItem>
                            <SelectItem value="catchtable" disabled>캐치테이블 (선택 불가)</SelectItem>

                            {/* Delivery Apps */}
                            <SelectItem value="baemin" className="text-blue-600 font-bold border-t border-gray-100 mt-2">배달의민족 (사장님광장)</SelectItem>
                            <SelectItem value="coupangeats" className="text-blue-600 font-bold">쿠팡이츠 (사장님포털)</SelectItem>
                            <SelectItem value="yogiyo" className="text-blue-600 font-bold">요기요 (사장님사이트)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {vendor === "payhere" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-2">
                            <Label htmlFor="api_key">API Key</Label>
                            <Input id="api_key" placeholder="페이히어 발급 API Key를 입력하세요" value={authCode1} onChange={e => setAuthCode1(e.target.value)} disabled={isLoading || isSuccess} />
                        </div>
                    </div>
                )}

                {vendor === "smartro" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-2">
                            <Label htmlFor="smartro_auth_key">인증키 (Auth Key)</Label>
                            <Input id="smartro_auth_key" placeholder="스마트로 API 인증키" value={authCode1} onChange={e => setAuthCode1(e.target.value)} disabled={isLoading || isSuccess} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smartro_comp_no">사업자번호 (COMP_NO)</Label>
                            <Input id="smartro_comp_no" placeholder="예: 2208115014" value={authCode2} onChange={e => setAuthCode2(e.target.value)} disabled={isLoading || isSuccess} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smartro_store_code">가맹점코드 (STORE_CODE)</Label>
                            <Input id="smartro_store_code" placeholder="예: 3900145" value={authCode3} onChange={e => setAuthCode3(e.target.value)} disabled={isLoading || isSuccess} />
                        </div>
                    </div>
                )}

                {vendor === "easypos" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-2">
                            <Label htmlFor="hd_code">본부코드 (HD_CODE)</Label>
                            <Input id="hd_code" placeholder="예: J2H" value={authCode1} onChange={e => setAuthCode1(e.target.value)} disabled={isLoading || isSuccess} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sp_code">매장코드 (SP_CODE)</Label>
                            <Input id="sp_code" placeholder="예: 000003" value={authCode2} onChange={e => setAuthCode2(e.target.value)} disabled={isLoading || isSuccess} />
                        </div>
                    </div>
                )}

                {vendor === "catchtable" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-2">
                            <Label htmlFor="catchtable_auth_key">인증키 (Auth Key)</Label>
                            <Input id="catchtable_auth_key" placeholder="캐치테이블 API 발급 토큰" value={authCode1} onChange={e => setAuthCode1(e.target.value)} disabled={isLoading || isSuccess} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="catchtable_store_code">매장코드 (Store Code)</Label>
                            <Input id="catchtable_store_code" placeholder="예: STORE_CT_123" value={authCode2} onChange={e => setAuthCode2(e.target.value)} disabled={isLoading || isSuccess} />
                        </div>
                    </div>
                )}

                {/* Delivery App Inputs */}
                {["baemin", "coupangeats", "yogiyo"].includes(vendor) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm mb-4">
                            ✅ 배달앱 연동은 백그라운드 크롤러를 통해 1~2분 정도 소요될 수 있습니다. 연동 시작 후 다른 작업을 진행하셔도 좋습니다.
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`${vendor}_id`}>사장님 사이트 아이디</Label>
                            <Input id={`${vendor}_id`} type="text" placeholder="로그인 아이디를 입력하세요" value={authCode1} onChange={e => setAuthCode1(e.target.value)} disabled={isLoading || isSuccess} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`${vendor}_pw`}>비밀번호</Label>
                            <Input id={`${vendor}_pw`} type="password" placeholder="비밀번호를 입력하세요" value={authCode2} onChange={e => setAuthCode2(e.target.value)} disabled={isLoading || isSuccess} required />
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="mt-8 overflow-hidden rounded-xl border border-gray-800 bg-[#0A0A0A] shadow-2xl animate-in slide-in-from-bottom-6 duration-500">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#141414]">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-mono text-gray-400">Execution Log ({vendor})</span>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                            </div>
                        </div>
                        <div className="p-4 h-[250px] overflow-y-auto font-mono text-xs sm:text-sm custom-scrollbar bg-black/50">
                            {logs.map((log, index) => (
                                <div key={index} className="flex gap-3 py-1 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <span className="text-gray-500 shrink-0 select-none">[{log.time}]</span>
                                    <span className={log.level === 'ERROR' ? 'text-red-400 font-medium' : log.level === 'WARN' ? 'text-yellow-400' : 'text-green-400'}>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                            {!isSuccess && (
                                <div className="flex gap-3 py-1 items-center">
                                    <span className="text-gray-500 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                                    <span className="text-gray-400 flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin text-blue-400" /> Waiting for pipeline trace...
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-end pt-4 border-t border-secondary mt-4">
                <Button
                    onClick={handleTestConnection}
                    disabled={!vendor || isLoading || isSuccess || !authCode1}
                    className={`min-w-[140px] transition-all ${isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-blue-700 text-white shadow-md'}`}
                >
                    {isLoading && !isSuccess && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSuccess ? '인증 성공! 이동 중...' : '연결 테스트 및 동기화 시작'}
                </Button>
            </CardFooter>
        </Card>
    );
}
