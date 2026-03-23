"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/StoreContext';
import { Bot, Send, Loader2, Sparkles, MessageSquare, Trash2, KeyRound, Clock, Plus, BarChart3, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'react-hot-toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePathname } from 'next/navigation';
import { format, subDays } from 'date-fns';
import axios from 'axios';

export default function ChatPage() {
    const pathname = usePathname();
    const { currentStore } = useStore();
    const [selectedEngine, setSelectedEngine] = useState("GEMINI");
    const [hasCheckedKey, setHasCheckedKey] = useState(false);
    const [isKeyValid, setIsKeyValid] = useState(false);
    const [showKeyPrompt, setShowKeyPrompt] = useState(false);
    const [tempKey, setTempKey] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Canvas Mode State
    const [canvasContent, setCanvasContent] = useState<string | null>(null);

    // BI Summary State
    const [biData, setBiData] = useState<any>(null);
    const [biLoading, setBiLoading] = useState(false);

    // Session State
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);

    const loadSessions = async () => {
        if (!currentStore) return;
        try {
            const res = await fetch(`/api/v1/chat/sessions?storeId=${currentStore.id}`);
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    };

    const fetchBiData = async () => {
        if (!currentStore) return;
        setBiLoading(true);
        try {
            const start = format(subDays(new Date(), 6), 'yyyy-MM-dd');
            const end = format(new Date(), 'yyyy-MM-dd');
            const res = await axios.post('/api/v1/analytics', {
                storeId: currentStore.id,
                startDate: start,
                endDate: end
            });
            if (res.data?.status === 'success') {
                setBiData(res.data.data);
            }
        } catch (err) {
            console.error("BI Fetch error", err);
        } finally {
            setBiLoading(false);
        }
    };

    useEffect(() => {
        if (currentStore) {
            loadSessions();
            fetchBiData();
        }
    }, [currentStore]);

    const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages, append } = useChat({
        api: '/api/v1/chat',
        body: {
            storeId: currentStore?.id,
            engine: selectedEngine,
            currentPath: pathname,
            // Inject recent BI summary directly as context so AI knows current stats seamlessly
            injectedContext: biData ? `
            [실시간 주간 지표 요약]
            - 총 결제금액: ${biData.totalRevenue}원
            - 결제건수: ${biData.totalOrders}건
            - 매장 유입(선택기간): ${biData.totalTraffic}명
            ` : ""
        },
        onError: (err: any) => {
            if (err.message.includes("API 키가 등록되지 않았습니다")) {
                setIsKeyValid(false);
                setShowKeyPrompt(true);
            } else {
                toast.error(err.message || "AI 응답 중 오류가 발생했습니다.");
            }
        },
        onFinish: async (message) => {
            // Check for CANVAS tags
            const canvasMatch = message.content.match(/<CANVAS>([\s\S]*?)<\/CANVAS>/);
            if (canvasMatch && canvasMatch[1]) {
                setCanvasContent(canvasMatch[1].trim());
            }

            setTimeout(async () => {
                const updatedMessages = [...messages, message];
                try {
                    const res = await fetch('/api/v1/chat/sessions', {
                        method: 'POST',
                        body: JSON.stringify({
                            id: currentSessionId,
                            storeId: currentStore?.id,
                            title: updatedMessages[0]?.content?.substring(0, 30) || "새로운 대화",
                            messages: updatedMessages
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (!currentSessionId) setCurrentSessionId(data.session.id);
                        loadSessions();
                    }
                } catch (e) {
                    console.error("Session sync failed");
                }
            }, 500);
        }
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const checkKey = async () => {
             try {
                const res = await fetch(`/api/v1/user/ai-keys`);
                if (res.ok) {
                    const data = await res.json();
                    const hasKey = data.keys.some((k: any) => k.engine === selectedEngine);
                    setIsKeyValid(hasKey);
                    if (!hasKey) setShowKeyPrompt(true);
                }
             } catch (e) {}
        };
        checkKey();
    }, [selectedEngine]);

    const handleSaveKey = async () => {
        if (!tempKey.trim()) return;
        try {
            const res = await fetch(`/api/v1/user/ai-keys`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ engine: selectedEngine, key: tempKey })
            });
            if (res.ok) {
                toast.success("API 키가 저장되었습니다!");
                setIsKeyValid(true);
                setShowKeyPrompt(false);
                setTempKey("");
            } else {
                toast.error("저장 실패");
            }
        } catch (e) {
            toast.error("네트워크 오류");
        }
    };

    const loadSession = (session: any) => {
        setCurrentSessionId(session.id);
        setMessages(session.messages.map((m: any) => ({
            id: m.id.toString(),
            role: m.role,
            content: m.content
        })));
        setCanvasContent(null);
    };

    const startNewSession = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setCanvasContent(null);
    };

    const handleShortcut = (prompt: string) => {
        if (!isKeyValid) {
            setShowKeyPrompt(true);
            return;
        }
        append({ role: 'user', content: prompt });
    };

    if (!currentStore) return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-white">
            
            {/* LEFT 70% : Main Chat UI */}
            <div className="flex-1 flex flex-col border-r border-[#E5E8EB] relative">
                
                {/* Header of Chat */}
                <div className="h-14 border-b border-[#E5E8EB] flex items-center justify-between px-6 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors" title="대화 기록 토글">
                            <Clock className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-indigo-600" />
                            <h2 className="font-bold text-[#191F28] text-lg">AI 어시스턴트</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={selectedEngine} onValueChange={setSelectedEngine}>
                            <SelectTrigger className="h-9 w-[130px] text-sm bg-white border-[#E5E8EB] rounded-lg">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GEMINI">Google Gemini</SelectItem>
                                <SelectItem value="OPENAI">OpenAI GPT</SelectItem>
                                <SelectItem value="CLAUDE">Claude 3.5</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Chat History Sidebar */}
                    {showSidebar && (
                        <div className="w-[260px] border-r border-[#E5E8EB] bg-[#F9FAFB] flex flex-col shrink-0">
                            <div className="p-4 border-b border-[#E5E8EB] flex justify-between items-center">
                                <span className="font-bold text-sm text-[#4E5968]">대화 기록</span>
                                <button onClick={startNewSession} className="p-1.5 hover:bg-[#E5E8EB] rounded-md transition-colors" title="새 대화">
                                    <Plus className="w-4 h-4 text-[#4E5968]" />
                                </button>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-3 space-y-1">
                                    {sessions.length === 0 ? (
                                        <p className="text-xs text-center text-[#8B95A1] py-4">최근 대화가 없습니다.</p>
                                    ) : sessions.map(s => (
                                        <div 
                                            key={s.id} 
                                            onClick={() => loadSession(s)}
                                            className={`p-2.5 rounded-lg text-[13px] cursor-pointer group flex justify-between items-center transition-colors ${currentSessionId === s.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-[#F2F4F6] text-[#4E5968] font-medium'}`}
                                        >
                                            <span className="truncate pr-2">{s.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Chat Messages */}
                    <div className="flex-1 flex flex-col relative w-full">
                        <ScrollArea className="flex-1 px-4 lg:px-24 xl:px-48 bg-white">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 pt-32 pb-20">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-2">
                                        <Sparkles className="w-8 h-8 text-white" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-[#191F28] tracking-tight">어떤 인사이트가 필요하신가요?</h1>
                                    <p className="text-[#8B95A1] text-sm max-w-[400px] leading-relaxed">
                                        우측의 추천 질문을 클릭하거나 하단 입력창에 점포 경영, 마케팅, 고객 피드백 등 자유롭게 물어보세요.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-8 py-8">
                                    {messages.map((m: any) => {
                                        const cleanContent = m.content.replace(/<CANVAS>[\s\S]*?<\/CANVAS>/g, "*(리포트 문서가 우측 뷰어에 생성되었습니다)*");
                                        return (
                                            <div key={m.id} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className="flex gap-4 max-w-[85%]">
                                                    {m.role !== 'user' && (
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
                                                            <Bot className="w-5 h-5 text-indigo-600" />
                                                        </div>
                                                    )}
                                                    <div className={`rounded-2xl px-5 py-4 text-[15px] leading-relaxed ${
                                                        m.role === 'user' 
                                                            ? 'bg-[#F2F4F6] text-[#191F28]' 
                                                            : 'text-[#333D4B]'
                                                    }`}>
                                                        <div className="markdown-prose prose-sm xl:prose-base max-w-none">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {cleanContent}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {isLoading && (
                                        <div className="flex w-full justify-start items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
                                                <Bot className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div className="flex items-center gap-2 text-indigo-500 bg-indigo-50/50 px-4 py-2 rounded-xl">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-sm font-medium">분석 중...</span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 lg:px-24 xl:px-48 bg-white border-t border-transparent bg-gradient-to-t from-white via-white to-transparent">
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                if (!isKeyValid) setShowKeyPrompt(true);
                                else handleSubmit(e);
                            }} className="relative flex shadow-sm rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 focus-within:bg-white transition-all max-w-4xl mx-auto">
                                <textarea
                                    value={input}
                                    onChange={handleInputChange}
                                    placeholder="분석을 원하는 내용을 입력하세요..."
                                    className="w-full min-h-[60px] max-h-[200px] bg-transparent border-none focus:ring-0 resize-none pl-5 pr-14 py-4 text-[15px] text-[#191F28] rounded-2xl leading-relaxed"
                                    rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 8) : 1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (input.trim()) {
                                                if (!isKeyValid) setShowKeyPrompt(true);
                                                else handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                                            }
                                        }
                                    }}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-3 bottom-3 p-2.5 bg-[#191F28] hover:bg-[#333D4B] disabled:bg-[#D1D6DB] text-white rounded-xl transition-colors flex items-center justify-center group"
                                >
                                    <Send className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </form>
                            <p className="text-center text-[11px] text-[#8B95A1] mt-3">
                                AI가 생성한 인사이트는 참고용이며 완벽하지 않을 수 있습니다. 중요한 의사결정 시 실제 대시보드 데이터를 한 번 더 확인하세요.
                            </p>
                        </div>
                    </div>
                </div>

                {/* API Key Wall Modal */}
                {showKeyPrompt && !isKeyValid && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col p-6 items-center justify-center text-center">
                        <KeyRound className="w-14 h-14 text-indigo-500 mb-5" />
                        <h2 className="text-2xl font-bold text-[#191F28] mb-3">{selectedEngine} API Key 등록</h2>
                        <p className="text-[15px] text-[#4E5968] mb-8 max-w-md leading-relaxed">강력한 대화형 분석 모델을 사용하기 위해 개인 API Key 등록이 필요합니다. 등록된 키는 안전하게 암호화되어 보관됩니다.</p>
                        <Input 
                            type="password"
                            placeholder="sk-..." 
                            value={tempKey}
                            onChange={(e) => setTempKey(e.target.value)}
                            className="w-full max-w-md h-12 text-center text-[15px] mb-4 bg-white border-[#E5E8EB] focus:ring-indigo-100"
                        />
                        <div className="flex gap-3 w-full max-w-md">
                            <Button variant="outline" className="flex-1 h-12 rounded-xl text-[15px] font-semibold" onClick={() => setShowKeyPrompt(false)}>취소</Button>
                            <Button className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-[15px] font-semibold" onClick={handleSaveKey}>저장하기</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT 30% : BI / Canvas Panel */}
            <div className="w-[30%] min-w-[320px] max-w-[450px] bg-[#FAFAFA] border-l flex flex-col h-full right-panel-anim shrink-0">
                {canvasContent ? (
                    // Canvas Mode View
                    <div className="flex flex-col h-full bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.03)] relative z-10 transition-all duration-300">
                        <div className="h-14 border-b border-[#E5E8EB] flex items-center justify-between px-5 shrink-0 bg-white">
                            <h3 className="font-bold text-[#191F28] flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-500" /> AI 리포트
                            </h3>
                            <button onClick={() => setCanvasContent(null)} className="p-1.5 hover:bg-[#F2F4F6] text-[#8B95A1] rounded-md transition-colors" title="닫기">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <ScrollArea className="flex-1 p-6">
                            <div className="markdown-prose prose-sm !max-w-none prose-h2:text-indigo-700 prose-h3:text-[#191F28] prose-a:text-blue-500 pb-10">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {canvasContent}
                                </ReactMarkdown>
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t border-[#E5E8EB] bg-slate-50 flex justify-end gap-2 shrink-0">
                             <Button variant="outline" className="text-xs h-8" onClick={() => setCanvasContent(null)}>닫기</Button>
                             <Button className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700" onClick={() => window.print()}>문서 저장</Button>
                        </div>
                    </div>
                ) : (
                    // Default BI Mode View
                    <div className="flex flex-col h-full transition-all duration-300">
                        <div className="p-5 border-b border-[#E5E8EB] bg-white shrink-0">
                            <h3 className="font-bold text-[#191F28] flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-500" /> 주간 요약 지표
                            </h3>
                            <p className="text-xs text-[#8B95A1] mt-1">최근 7일 기준 매장 핵심 데이터</p>
                        </div>
                        <ScrollArea className="flex-1 p-5">
                            <div className="space-y-4">
                                {/* Summary Cards */}
                                <div className="bg-white rounded-xl border border-[#E5E8EB] p-4 shadow-sm">
                                    <div className="text-xs font-semibold text-[#8B95A1] mb-1">총 결제금액</div>
                                    <div className="text-xl font-bold text-[#191F28] tracking-tight">
                                        {biLoading || !biData ? "로딩중..." : `${new Intl.NumberFormat('ko-KR').format(biData.totalRevenue)}원`}
                                    </div>
                                    {!biLoading && biData && (
                                        <div className={`text-xs font-bold mt-2 ${parseFloat(biData.wowDelta.totalRevenue) >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                            주간 대비 {biData.wowDelta.totalRevenue}%
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white rounded-xl border border-[#E5E8EB] p-4 shadow-sm">
                                    <div className="text-xs font-semibold text-[#8B95A1] mb-1">결제 건수</div>
                                    <div className="text-xl font-bold text-[#191F28] tracking-tight">
                                        {biLoading || !biData ? "로딩중..." : `${new Intl.NumberFormat('ko-KR').format(biData.totalOrders)}건`}
                                    </div>
                                    {!biLoading && biData && (
                                        <div className={`text-xs font-bold mt-2 ${parseFloat(biData.wowDelta.totalOrders) >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                            주간 대비 {biData.wowDelta.totalOrders}%
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white rounded-xl border border-[#E5E8EB] p-4 shadow-sm">
                                    <div className="text-xs font-semibold text-[#8B95A1] mb-1">추정 유동인구 (1주)</div>
                                    <div className="text-xl font-bold text-[#191F28] tracking-tight">
                                        {biLoading || !biData ? "로딩중..." : `${new Intl.NumberFormat('ko-KR').format(biData.totalTraffic)}명`}
                                    </div>
                                </div>

                                {/* Suggested Prompts */}
                                <div className="pt-6">
                                    <h4 className="font-semibold text-sm text-[#4E5968] mb-3">바로 질문하기 (Shortcuts)</h4>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => handleShortcut("이번 주와 지난 주 핵심 지표의 차이를 3가지 원인으로 진단해 줘. <CANVAS> 형태로 리포트를 짜줘.")} className="w-full text-left p-3 rounded-lg bg-white border border-[#E5E8EB] hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group flex justify-between items-center shadow-sm">
                                            <span className="text-[13px] text-[#4E5968] font-medium leading-tight">주간 핵심지표 증감 원인 분석하기</span>
                                            <ChevronRight className="w-4 h-4 text-[#B0B8C1] group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
                                        </button>
                                        <button onClick={() => handleShortcut("방문객 전환율(퍼널)을 올리기 위한 당장 실행 가능한 액션 플랜 3개를 제안해 줘. <CANVAS> 리포트 형태로.")} className="w-full text-left p-3 rounded-lg bg-white border border-[#E5E8EB] hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group flex justify-between items-center shadow-sm">
                                            <span className="text-[13px] text-[#4E5968] font-medium leading-tight">매장 전환율 상승 액션 플랜 3가지</span>
                                            <ChevronRight className="w-4 h-4 text-[#B0B8C1] group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
                                        </button>
                                        <button onClick={() => handleShortcut("객단가를 높이기 위해 잘나가는 메뉴(ABC분석)를 활용한 마케팅 방안을 <CANVAS> 보고서 구조로 정리해 줘.")} className="w-full text-left p-3 rounded-lg bg-white border border-[#E5E8EB] hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group flex justify-between items-center shadow-sm">
                                            <span className="text-[13px] text-[#4E5968] font-medium leading-tight">우수 메뉴(ABC) 활용 객단가 방안</span>
                                            <ChevronRight className="w-4 h-4 text-[#B0B8C1] group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>
            
        </div>
    );
}
