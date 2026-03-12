"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/StoreContext';
import { Bot, X, Send, Maximize2, Minimize2, Loader2, Sparkles, MessageSquare, Trash2, KeyRound, Clock, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'react-hot-toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import remarkGfm from 'remark-gfm';
import { usePathname } from 'next/navigation';

export default function FloatingChatAgent() {
    const pathname = usePathname();
    const { currentStore } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // Full screen toggle
    const [selectedEngine, setSelectedEngine] = useState("GEMINI");
    const [hasCheckedKey, setHasCheckedKey] = useState(false);
    const [isKeyValid, setIsKeyValid] = useState(false);
    
    // Quick Settings Prompts
    const [showKeyPrompt, setShowKeyPrompt] = useState(false);
    const [tempKey, setTempKey] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Session Management State
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);

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

    useEffect(() => {
        if (isOpen) loadSessions();
    }, [isOpen, currentStore]);

    // Vercel AI SDK hook setup
    const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
        api: '/api/v1/chat',
        body: {
            storeId: currentStore?.id,
            engine: selectedEngine,
            currentPath: pathname
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
            // Wait for internal state to update
            setTimeout(async () => {
                const updatedMessages = [...messages, message]; // Optimistic full context
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

    const loadSession = (session: any) => {
        setCurrentSessionId(session.id);
        setMessages(session.messages.map((m: any) => ({
            id: m.id.toString(),
            role: m.role,
            content: m.content
        })));
        if (window.innerWidth < 768) setShowSidebar(false);
    };

    const startNewSession = () => {
        setCurrentSessionId(null);
        setMessages([]);
        if (window.innerWidth < 768) setShowSidebar(false);
    };

    const deleteSession = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        try {
            const res = await fetch('/api/v1/chat/sessions', {
                method: 'DELETE',
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                if (currentSessionId === id) startNewSession();
                loadSessions();
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Auto-scroll inside chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Check key aggressively when engine changes
    useEffect(() => {
        if (!isOpen) return;
        const checkKey = async () => {
             try {
                const res = await fetch(`/api/v1/user/ai-keys`);
                if (res.ok) {
                    const data = await res.json();
                    const hasKey = data.keys.some((k: any) => k.engine === selectedEngine);
                    setIsKeyValid(hasKey);
                    if (!hasKey) setShowKeyPrompt(true);
                }
             } catch (e) {
                 // Ignore
             }
        };
        checkKey();
    }, [selectedEngine, isOpen]);

    const handleSaveKey = async (saveToDb = true) => {
        if (!tempKey.trim()) return;
        if (saveToDb) {
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
        } else {
            // Temporary Key logic would need to pass this key to the useChat body
            toast.error("1회성 키 사용 모드는 현재 Vercel AI SDK 보안 상 지원하지 않습니다. 키를 저장해주세요.");
        }
    };

    if (!currentStore) return null;

    return (
        <>
            {/* Floating Action Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
                >
                    <Sparkles className="w-6 h-6 animate-pulse" />
                    <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 ease-in-out font-medium">
                        AI 어시스턴트
                    </span>
                </button>
            )}

            {/* Backdrop for explicit focus when expanded */}
            {isOpen && isExpanded && (
                <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" onClick={() => setIsExpanded(false)} />
            )}

            {/* Sliding Chat Panel */}
            <div 
                className={`fixed top-0 right-0 h-full bg-white shadow-[0_0_40px_rgba(0,0,0,0.1)] z-50 flex flex-col transition-all duration-500 ease-in-out border-l border-indigo-100 ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                } ${isExpanded ? 'w-full md:w-[80vw] lg:w-[60vw]' : 'w-full sm:w-[400px] md:w-[450px]'}`}
            >
                {/* Header */}
                <div className="h-16 border-b border-[#F2F4F6] flex items-center justify-between px-4 shrink-0 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors relative">
                            <Clock className="w-5 h-5" />
                        </button>
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[#191F28] text-sm">Resogenie AI</h3>
                            <p className="text-[11px] text-[#8B95A1] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                {currentStore.name} 데이터 연동 중
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Select value={selectedEngine} onValueChange={setSelectedEngine}>
                            <SelectTrigger className="h-8 w-[110px] text-xs bg-white border-[#E5E8EB]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GEMINI" className="text-xs">Google Gemini</SelectItem>
                                <SelectItem value="OPENAI" className="text-xs">OpenAI GPT</SelectItem>
                                <SelectItem value="CLAUDE" className="text-xs">Claude 3.5</SelectItem>
                            </SelectContent>
                        </Select>

                        <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors hidden sm:block">
                            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setIsOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* API Key Wall */}
                {isOpen && showKeyPrompt && !isKeyValid && (
                    <div className="absolute inset-0 top-16 bg-white z-20 flex flex-col p-6 items-center justify-center text-center">
                        <KeyRound className="w-12 h-12 text-indigo-400 mb-4" />
                        <h2 className="text-lg font-bold text-[#191F28] mb-2">{selectedEngine} API Key 필요</h2>
                        <p className="text-sm text-[#8B95A1] mb-6">해당 AI 모델을 사용하기 위해 개인 API Key 등록이 필요합니다. 등록된 키는 종단간 암호화되어 안전하게 보관됩니다.</p>
                        <Input 
                            type="password"
                            placeholder="sk-..." 
                            value={tempKey}
                            onChange={(e) => setTempKey(e.target.value)}
                            className="w-full text-center mb-4"
                        />
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>취소</Button>
                            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => handleSaveKey(true)}>저장 후 계속</Button>
                        </div>
                    </div>
                )}

                <div className="flex-1 flex overflow-hidden relative">
                    {/* Sidebar History */}
                    {showSidebar && (
                        <div className="absolute inset-y-0 left-0 w-[240px] bg-white border-r border-[#E5E8EB] shadow-lg z-30 flex flex-col transform transition-transform duration-300">
                            <div className="p-3 border-b flex justify-between items-center">
                                <span className="font-bold text-sm">대화 기록</span>
                                <button onClick={startNewSession} className="p-1.5 hover:bg-gray-100 rounded-md">
                                    <Plus className="w-4 h-4 text-gray-600" />
                                </button>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-1">
                                    {sessions.length === 0 ? (
                                        <p className="text-xs text-center text-gray-400 mt-4">기록이 없습니다</p>
                                    ) : sessions.map(s => (
                                        <div 
                                            key={s.id} 
                                            onClick={() => loadSession(s)}
                                            className={`p-2 rounded-md text-sm cursor-pointer group flex justify-between items-center ${currentSessionId === s.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            <span className="truncate pr-2">{s.title}</span>
                                            <button onClick={(e) => deleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded-md transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Chat Area */}
                    <ScrollArea className="flex-1 p-4 bg-white" onClick={() => window.innerWidth < 768 && showSidebar && setShowSidebar(false)}>
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 pt-10 opacity-70">
                            <MessageSquare className="w-12 h-12 text-indigo-200" />
                            <div>
                                <h4 className="font-medium text-[#333D4B] mb-1">무엇을 도와드릴까요?</h4>
                                <p className="text-xs text-[#8B95A1] max-w-[250px] leading-relaxed">
                                    "어제 유동인구 대비 우리 매장 방문객 비율은 어때?"<br/>
                                    "최근 일주일 동안 가장 많이 팔린 메뉴는 뭐야?"
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 pb-4">
                            {messages.map((m: any) => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                                        m.role === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-tr-sm' 
                                            : 'bg-[#F2F4F6] text-[#333D4B] rounded-tl-sm border border-[#E5E8EB]'
                                    }`}>
                                        <div className="markdown-prose">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {m.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-[#F2F4F6] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-indigo-500 shadow-sm border border-[#E5E8EB]">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm font-medium">분석 중...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </ScrollArea>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-[#F2F4F6]">
                    {error && (
                        <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded-md text-xs text-red-600 flex items-center justify-between">
                            <span>{error.message}</span>
                        </div>
                    )}
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!isKeyValid) setShowKeyPrompt(true);
                        else handleSubmit(e);
                    }} className="relative flex items-end">
                        <textarea
                            value={input}
                            onChange={handleInputChange}
                            placeholder="매장 데이터에 대해 물어보세요..."
                            className="w-full min-h-[50px] max-h-[120px] bg-[#F9FAFB] border border-[#E5E8EB] focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl pl-4 pr-12 py-3 text-sm resize-none transition-all"
                            rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 4) : 1}
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
                            className="absolute right-2 bottom-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#D1D6DB] text-white rounded-lg transition-colors flex items-center justify-center group"
                        >
                            <Send className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </form>
                    <div className="mt-2 text-center flex justify-between items-center px-1">
                        <span className="text-[10px] text-[#B0B8C1]">AI는 가끔 실수를 할 수 있습니다. 중요한 결정을 내리기 전에 데이터를 확인하세요.</span>
                        {messages.length > 0 && (
                            <button onClick={() => setMessages([])} className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                                <Trash2 className="w-3 h-3" /> 대화 지우기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
