import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { b_no } = body;

        if (!b_no || !Array.isArray(b_no)) {
            return NextResponse.json({ detail: "Invalid request payload. b_no array required." }, { status: 400 });
        }

        const API_KEY = process.env.DATA_GO_KR_API_KEY;

        if (!API_KEY) {
            // Mock response if API key is not configured
            console.warn("DATA_GO_KR_API_KEY is missing. Returning a mocked success response.");
            return NextResponse.json({
                status_code: "OK",
                data: [
                    { b_no: b_no[0], b_stt: "계속사업자" }
                ]
            });
        }

        const res = await fetch(`https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ b_no }),
            cache: "no-store"
        });

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Business verification proxy error:", error);
        return NextResponse.json({ detail: "External API Request Failed" }, { status: 500 });
    }
}
