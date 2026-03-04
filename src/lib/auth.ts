import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function getUserFromSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) return null;

    try {
        const secretKey = process.env.JWT_SECRET_KEY || "restogenie_secret_key_random_string_here_12345";
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secretKey));

        return {
            id: parseInt(payload.sub as string, 10),
            email: payload.email as string,
        };
    } catch (e) {
        console.error("JWT Verification failed", e);
        return null;
    }
}
