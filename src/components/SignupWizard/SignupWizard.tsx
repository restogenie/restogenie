"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { Step1PersonalInfo } from "./Step1PersonalInfo";
import { Step2BusinessInfo } from "./Step2BusinessInfo";
import { Step3Terms } from "./Step3Terms";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignupWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);

    // Global Form State
    const [formData, setFormData] = useState({
        // Step 1
        email: "",
        password: "",
        name: "",
        phone: "",
        // Step 2
        businessName: "",
        businessNumber: "",
        businessCondition: "",
        businessType: "",
        openingDate: "",
        storePhone: "",
        // Step 3
        agreedTerms: false,
        agreedPrivacy: false,
        agreedMarketing: false,
    });

    const updateFormData = (data: Partial<typeof formData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };

    const handleNext = () => setStep(s => s + 1);
    const handlePrev = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        try {
            const res = await fetch("/api/v1/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "회원가입에 실패했습니다.");
            }

            setStep(4); // Success step
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-8">
            {/* Stepper Header */}
            {step < 4 && (
                <div className="flex justify-between relative mb-12 px-12">
                    <div className="absolute top-1/2 left-16 right-16 h-0.5 bg-secondary -z-10 -translate-y-1/2" />
                    <div className={`absolute top-1/2 left-16 h-0.5 bg-blue-600 -z-10 -translate-y-1/2 transition-all duration-500 ease-in-out ${step === 1 ? 'w-0' : step === 2 ? 'w-1/2' : 'w-[calc(100%-8rem)]'}`} />

                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors duration-300 ${step >= i ? 'bg-blue-600 text-white shadow-md' : 'bg-secondary text-muted-foreground'}`}>
                                {step > i ? <CheckCircle2 className="w-6 h-6" /> : i}
                            </div>
                            <span className={`text-sm font-medium ${step >= i ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {i === 1 ? "개인정보" : i === 2 ? "사업자정보" : "약관동의"}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Steps Content */}
            <div className="relative">
                {step === 1 && (
                    <Step1PersonalInfo
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleNext}
                    />
                )}

                {step === 2 && (
                    <Step2BusinessInfo
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleNext}
                        onPrev={handlePrev}
                    />
                )}

                {step === 3 && (
                    <Step3Terms
                        formData={formData}
                        updateFormData={updateFormData}
                        onSubmit={handleSubmit}
                        onPrev={handlePrev}
                    />
                )}

                {step === 4 && (
                    <div className="text-center space-y-6 py-12 animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">가입이 완료되었습니다!</h2>
                        <p className="text-gray-500 text-lg max-w-md mx-auto">
                            RestoGenie에서 다중 사업장 매출 통합 관리를 바로 시작해보세요.
                        </p>
                        <div className="pt-8">
                            <Button
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto px-12"
                                onClick={() => router.push('/login')}
                            >
                                로그인 화면으로 이동
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
