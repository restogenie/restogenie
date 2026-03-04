import { NextResponse } from 'next/server';
import { prisma as db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            email, password, name, phone,
            businessName, businessNumber, businessCondition, businessType, openingDate, storePhone,
            agreedTerms, agreedPrivacy, agreedMarketing
        } = body;

        // Validation
        if (!email || !password || !name) {
            return NextResponse.json({ detail: "필수 개인 정보를 입력해주세요." }, { status: 400 });
        }
        if (!businessName || !businessNumber) {
            return NextResponse.json({ detail: "필수 사업장 정보를 입력해주세요." }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ detail: "이미 가입된 이메일 계정입니다." }, { status: 409 });
        }

        // Password Hashing
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Transaction: Create User -> Store
        await db.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    password_hash: passwordHash,
                    name,
                    phone,
                    agreed_terms: agreedTerms,
                    agreed_privacy: agreedPrivacy,
                    agreed_marketing: agreedMarketing,
                }
            });

            await tx.store.create({
                data: {
                    user_id: user.id,
                    name: businessName,
                    business_number: businessNumber,
                    business_condition: businessCondition,
                    business_type: businessType,
                    opening_date: openingDate ? new Date(openingDate) : null,
                    phone: storePhone,
                }
            });
        });

        return NextResponse.json({ detail: "회원가입이 성공적으로 완료되었습니다." }, { status: 201 });

    } catch (error: any) {
        console.error("Signup error:", error);
        return NextResponse.json({ detail: "회원가입 처리 중 데이터 베이스 오류가 발생했습니다." }, { status: 500 });
    }
}
