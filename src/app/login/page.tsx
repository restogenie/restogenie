"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Lock } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append("username", email);
            formData.append("password", password);

            const res = await fetch(`/api/v1/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "이메일 또는 비밀번호가 일치하지 않습니다.");
            }

            const data = await res.json();

            // Store token in cookies for middleware (1 day expiry)
            document.cookie = `admin_token=${data.access_token}; path=/; max-age=86400; SameSite=Strict`;

            // Redirect to dashboard
            toast.success("로그인 되었습니다.");
            router.push("/dashboard");
            router.refresh();

        } catch (err: any) {
            toast.error(err.message || "로그인에 실패하였습니다.");
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#F2F4F6] p-4 flex-col gap-6">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#3182F6] text-white font-bold flex items-center justify-center rounded-md mb-3 shadow-sm text-xl">
                    R
                </div>
                <h1 className="text-xl font-bold text-[#191F28]">RestoGenie</h1>
            </div>

            <Card className="w-full max-w-[400px] shadow-sm border-[#E5E8EB]/40">
                <CardHeader className="space-y-1 text-center pt-8">
                    <CardTitle className="text-2xl font-bold tracking-tight text-[#191F28]">로그인</CardTitle>
                    <CardDescription className="text-[#8B95A1] text-[15px] pt-1">
                        RestoGenie 계정으로 로그인해주세요.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-3">
                            <Input
                                id="email"
                                type="email"
                                placeholder="이메일 주소"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-[52px] px-4 rounded-md bg-[#F9FAFB] border-[#E5E8EB] focus-visible:ring-[#3182F6]/30 text-[15px]"
                            />
                            <Input
                                id="password"
                                type="password"
                                placeholder="비밀번호"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-[52px] px-4 rounded-md bg-[#F9FAFB] border-[#E5E8EB] focus-visible:ring-[#3182F6]/30 text-[15px]"
                            />
                        </div>
                        {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
                        <Button
                            type="submit"
                            className="w-full h-[52px] rounded-md bg-[#3182F6] hover:bg-[#1b64da] text-white font-semibold text-[15px] shadow-sm transition-all mt-2"
                            disabled={loading}
                        >
                            {loading ? "로그인 중..." : "로그인"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col border-t border-[#F2F4F6] p-6 bg-[#FAFAFA] rounded-b-xl gap-4">
                    <div className="text-center text-sm text-[#8B95A1]">
                        아직 계정이 없으신가요?
                    </div>
                    <Link href="/signup" className="w-full">
                        <Button variant="outline" className="w-full h-[52px] rounded-md font-semibold text-[#4E5968] border-[#E5E8EB] hover:bg-[#F2F4F6] text-[15px]">
                            회원가입하기
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
