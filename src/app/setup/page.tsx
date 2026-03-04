"use client";

import { useState } from "react";
import { StepOneConnector } from "@/components/Wizard/StepOneConnector";
import { StepTwoMapping } from "@/components/Wizard/StepTwoMapping";
import { StepThreeSchedule } from "@/components/Wizard/StepThreeSchedule";

export default function Home() {
  const [step, setStep] = useState(1);

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);
  const handleComplete = () => {
    // Pipeline activated, reset or redirect logic could go here
    // In this SPA we can just let StepThree show the success screen
  };

  return (
    <div className="min-h-screen bg-transparent font-sans selection:bg-primary/20">

      <main className="container mx-auto py-10 px-4 max-w-6xl">
        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-border">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">다중 POS 데이터 연동</h1>
          <p className="text-muted-foreground">이기종 POS 결제 데이터를 수집하고 앱의 표준 스키마에 맞게 매핑합니다.</p>
        </div>

        {/* Wizard Progress Bar - Toss UI inspired */}
        <div className="flex items-center justify-center mb-12 max-w-3xl mx-auto">
          <div className="flex w-full items-center">
            {/* Step 1 */}
            <div className="flex flex-col items-center relative">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= 1 ? 'bg-primary text-white shadow-md' : 'bg-secondary text-muted-foreground'}`}>
                1
              </div>
              <span className={`absolute top-12 text-sm whitespace-nowrap font-medium ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>커넥터 설정</span>
            </div>
            {/* Divider */}
            <div className={`flex-1 h-[2px] mx-2 transition-colors ${step >= 2 ? 'bg-primary' : 'bg-secondary'}`} />

            {/* Step 2 */}
            <div className="flex flex-col items-center relative">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= 2 ? 'bg-primary text-white shadow-md' : 'bg-secondary text-muted-foreground'}`}>
                2
              </div>
              <span className={`absolute top-12 text-sm whitespace-nowrap font-medium ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>스키마 디스커버리</span>
            </div>
            {/* Divider */}
            <div className={`flex-1 h-[2px] mx-2 transition-colors ${step >= 3 ? 'bg-primary' : 'bg-secondary'}`} />

            {/* Step 3 */}
            <div className="flex flex-col items-center relative">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= 3 ? 'bg-primary text-white shadow-md' : 'bg-secondary text-muted-foreground'}`}>
                3
              </div>
              <span className={`absolute top-12 text-sm whitespace-nowrap font-medium ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>자동화 스케줄</span>
            </div>
          </div>
        </div>

        {/* Render Steps */}
        <div className="mt-8 transition-all duration-300">
          {step === 1 && <StepOneConnector onNext={handleNext} />}
          {step === 2 && <StepTwoMapping onNext={handleNext} onPrev={handlePrev} />}
          {step === 3 && <StepThreeSchedule onComplete={handleComplete} onPrev={handlePrev} />}
        </div>
      </main>
    </div>
  );
}
