import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from "jose";

export async function proxy(request: NextRequest) {
    const token = request.cookies.get('admin_token')?.value

    const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/mapping') ||
        request.nextUrl.pathname.startsWith('/logs') ||
        request.nextUrl.pathname.startsWith('/setup')

    if (isProtectedRoute) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        try {
            const secretKey = process.env.JWT_SECRET_KEY || "restogenie_secret_key_random_string_here_12345";
            await jwtVerify(token, new TextEncoder().encode(secretKey));
        } catch (error) {
            // Token is invalid or expired
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    if (request.nextUrl.pathname === '/login' && token) {
        try {
            const secretKey = process.env.JWT_SECRET_KEY || "restogenie_secret_key_random_string_here_12345";
            await jwtVerify(token, new TextEncoder().encode(secretKey));
            return NextResponse.redirect(new URL('/dashboard', request.url))
        } catch (error) {
            // Token invalid, allow login page
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/', '/dashboard/:path*', '/mapping/:path*', '/logs/:path*', '/setup/:path*', '/login'],
}
