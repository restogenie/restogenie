"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function LoginPage() {
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
            // OAuth2 requires username, any string works since our backend only checks password
            formData.append("username", "admin");
            formData.append("password", password);

            const res = await fetch(`/api/v1/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData,
            });

            if (!res.ok) {
                throw new Error("비밀번호가 일치하지 않습니다.");
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
        <div className="flex h-screen w-full items-center justify-center bg-toss-bg">
            <Card className="w-full max-w-sm shadow-sm border-toss-border/40">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-toss-blue/10 rounded-full flex items-center justify-center">
                            <Lock className="w-6 h-6 text-toss-blue" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-semibold tracking-tight">관리자 로그인</CardTitle>
                    <CardDescription className="text-toss-gray">
                        RestoGenie 대시보드 접근을 위해 비밀번호를 입력해주세요.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                id="password"
                                type="password"
                                placeholder="관리자 비밀번호"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-12 focus-visible:ring-toss-blue/30"
                            />
                        </div>
                        {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
                        <Button
                            type="submit"
                            className="w-full h-12 bg-toss-blue hover:bg-toss-blueHover text-white font-medium shadow-sm transition-all"
                            disabled={loading}
                        >
                            {loading ? "로그인 중..." : "로그인"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
