"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { Loader2, Bot, Trash2, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ENGINES = [
    { value: "OPENAI", label: "OpenAI (GPT)" },
    { value: "GEMINI", label: "Google (Gemini)" },
    { value: "CLAUDE", label: "Anthropic (Claude)" }
];

export default function AiKeysTab() {
    const [isLoading, setIsLoading] = useState(true);
    const [keys, setKeys] = useState<any[]>([]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedEngine, setSelectedEngine] = useState("GEMINI");
    const [keyValue, setKeyValue] = useState("");

    const fetchKeys = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/v1/user/ai-keys`);
            if (response.ok) {
                const data = await response.json();
                setKeys(data.keys || []);
            }
        } catch (e) {
            console.error("Failed to load AI keys", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleSaveKey = async () => {
        if (!keyValue.trim()) {
            toast.error("API Key를 입력해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/v1/user/ai-keys`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ engine: selectedEngine, key: keyValue })
            });
            
            if (res.ok) {
                toast.success("API Key가 안전하게 저장되었습니다.");
                setKeyValue("");
                fetchKeys();
            } else {
                const data = await res.json();
                toast.error(data.detail || "저장에 실패했습니다.");
            }
        } catch (e) {
            toast.error("네트워크 오류");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteKey = async (id: number, engine: string) => {
        if (!confirm(`정말로 ${engine} 연동을 해제하시겠습니까? 데이터베이스에서 키가 즉시 영구 삭제됩니다.`)) return;

        try {
            const res = await fetch(`/api/v1/user/ai-keys?id=${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success(`${engine} 연동이 해제되었습니다.`);
                setKeys(prev => prev.filter(k => k.id !== id));
            } else {
                toast.error("항목 삭제 중 오류가 발생했습니다.");
            }
        } catch (e) {
            toast.error("네트워크 오류");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-[#191F28]">
                        <Bot className="w-5 h-5 text-indigo-600" />
                        AI 모델 API Key 관리
                    </h2>
                    <p className="text-sm text-[#8B95A1] mt-1">앱 전반의 AI 에이전트 및 메뉴 분석 로직 구동에 사용되는 개인 키를 안전하게 보관합니다.<br/>(저장된 키는 암호화(AES-256)되어 보관됩니다)</p>
                </div>
            </div>

            <Card className="shadow-sm border-[#E5E8EB]">
                <CardHeader className="pb-4 border-b border-[#F2F4F6] bg-slate-50">
                    <CardTitle className="text-base text-[#333D4B]">신규 API Key 등록</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-1/3 space-y-2">
                            <label className="text-sm font-semibold text-[#4E5968]">AI 엔진 선택</label>
                            <Select value={selectedEngine} onValueChange={setSelectedEngine}>
                                <SelectTrigger className="w-full bg-white transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg">
                                    <SelectValue placeholder="AI 모델 엔진" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ENGINES.map(e => (
                                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-2/3 space-y-2">
                            <label className="text-sm font-semibold text-[#4E5968]">API Key 입력</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    type="password"
                                    value={keyValue}
                                    onChange={(e) => setKeyValue(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full bg-white pl-10 pr-4 py-2 text-sm border-[#E5E8EB] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all rounded-lg"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleSaveKey}
                            disabled={isSubmitting || !keyValue}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium whitespace-nowrap rounded-md"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "저장"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="font-semibold text-[#333D4B]">등록된 AI 키 목록</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isLoading ? (
                        <div className="col-span-1 md:col-span-2 flex justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        </div>
                    ) : keys.length === 0 ? (
                        <div className="col-span-1 md:col-span-2 p-6 text-center text-sm text-[#8B95A1] border border-dashed rounded-md bg-[#F9FAFB]">
                            등록된 API Key가 없습니다.
                        </div>
                    ) : keys.map((k) => (
                        <Card key={k.id} className="shadow-sm border-[#E5E8EB]">
                            <CardHeader className="pb-3 border-b border-[#F2F4F6]">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                        <span className="uppercase text-[#191F28]">{k.engine}</span>
                                    </CardTitle>
                                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                                        Active
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    마지막 업데이트: {new Date(k.updated_at).toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="bg-[#F9FAFB] p-3 rounded-md border border-[#E5E8EB] space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#8B95A1] font-medium">Encrypted Storage</span>
                                        <span className="font-mono text-[#333D4B] flex items-center gap-1 text-xs">
                                            AES-256-GCM Secure
                                            <KeyRound className="w-3 h-3 text-green-500" />
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                                        onClick={() => handleDeleteKey(k.id, k.engine)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        키 삭제
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
