import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { decrypt } from "@/lib/encryption";

export async function POST(request: Request) {
    const user = await getUserFromSession();
    if (!user) {
        return NextResponse.json({ detail: "Could not validate credentials" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { store_id } = body;

        if (!store_id) {
            return NextResponse.json({ detail: "store_id is required" }, { status: 400 });
        }

        const storeId = parseInt(store_id, 10);

        // Authorization check
        const store = await prisma.store.findFirst({
            where: { id: storeId, user_id: user.id }
        });

        const storeMember = await prisma.storeMember.findFirst({
            where: { store_id: storeId, user_id: user.id }
        });

        if (!store && !storeMember) {
            return NextResponse.json({ detail: "Forbidden access to this store" }, { status: 403 });
        }

        const aiKeyRecord = await prisma.aiApiKey.findFirst({
            where: { user_id: user.id, engine: "GEMINI", is_active: true }
        });

        if (!aiKeyRecord) {
            return NextResponse.json({ detail: "AI API 키가 등록되지 않았습니다. 설정 > API 연동 환경에서 Gemini API Key를 등록해주세요." }, { status: 400 });
        }

        let apiKey = "";
        try {
            apiKey = decrypt(aiKeyRecord.encrypted_key);
        } catch (e) {
            return NextResponse.json({ detail: "API 키 복호화에 실패했습니다. 키를 다시 등록해주세요." }, { status: 500 });
        }

        // 1. Find up to 50 unmapped unique items
        const unmappedData = await prisma.$queryRaw<Array<{ original_name: string; provider: string }>>`
            SELECT m.product_name as original_name, s.provider
            FROM menu_db m
            JOIN sales_db s ON m.oid = s.oid
            WHERE s.store_id = ${storeId}
            AND m.product_name NOT IN (
                SELECT original_name FROM menu_mapping_db WHERE store_id = ${storeId}
            )
            AND m.product_name IS NOT NULL
            AND m.product_name != ''
            GROUP BY m.product_name, s.provider
            LIMIT 50;
        `;

        if (!unmappedData || unmappedData.length === 0) {
            return NextResponse.json({
                status: "success",
                message: "새롭게 매핑할 미분류 메뉴가 없습니다.",
                count: 0
            });
        }

        // 2. Call Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const promptStr = `
You are an expert F&B menu cataloger. 
I will provide a JSON array of raw POS menu names from various providers. 
Your task is to normalize them into clean, standard menu names.

RULES:
1. 'normalized_name': The standard aligned name. e.g. '아아', '아이스 아메리카노(L)' -> '아메리카노'. If it is a meaningless option modifier (e.g., '얼음많이', '샷추가'), return empty string.
2. 'custom_id': A short, unique uppercase ID for the menu (e.g., 'MENU_AMERICANO', 'M001'). Try to use consistent prefixes for related items (like 'BURGER_XXXX').
3. 'is_option': Boolean. True if the item is just an option/modifier (e.g., '샷추가', '사이즈업', '얼음많이'), False if it is a main standalone menu item.

If you are unsure, provide your best guess.

Input:
${JSON.stringify(unmappedData)}

Output FORMAT requirement:
Return ONLY a valid JSON array of objects, with NO Markdown wrappers, NO code blocks, like this:
[
  { "provider": "payhere", "original_name": "아아", "normalized_name": "아메리카노", "custom_id": "DRINK_AMERICANO", "is_option": false },
  { "provider": "easypos", "original_name": "샷추가", "normalized_name": "", "custom_id": "OPT_SHOT", "is_option": true }
]
`;

        const aiResult = await model.generateContent(promptStr);
        let textResponse = aiResult.response.text();

        // Clean markdown backticks if any
        textResponse = textResponse.replace(/^```json/g, '').replace(/^```/g, '').replace(/```$/g, '').trim();

        let parsedAiArray = [];
        try {
            parsedAiArray = JSON.parse(textResponse);
        } catch (e) {
            console.error("Failed to parse Gemini response:", textResponse);
            return NextResponse.json({ detail: "AI 응답을 해석하는데 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({
            status: "success",
            message: `AI 스캔 완료! ${parsedAiArray.length}건의 메뉴에 대한 매핑 초안이 제안되었습니다.`,
            count: parsedAiArray.length,
            data: parsedAiArray
        });

    } catch (error: any) {
        console.error("AI Mapping API Error:", error);
        return NextResponse.json(
            { detail: "AI 메뉴 맵핑 처리 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
