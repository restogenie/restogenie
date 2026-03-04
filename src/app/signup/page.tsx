import { SignupWizard } from "@/components/SignupWizard/SignupWizard";

export default function SignupPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="mb-10 text-center space-y-2">
                <h1 className="text-4xl font-extrabold text-[#001D4A]">RestoGenie</h1>
                <p className="text-gray-500 text-lg">새로운 비즈니스 관리의 시작, 환영합니다.</p>
            </div>

            <div className="w-full relative z-10 transition-all duration-300">
                <SignupWizard />
            </div>

            <p className="mt-8 text-sm text-gray-500">
                이미 계정이 있으신가요?
                <a href="/login" className="ml-2 text-blue-600 font-semibold hover:underline">로그인하기</a>
            </p>
        </div>
    );
}
