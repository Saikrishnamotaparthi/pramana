import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const authStatus = request.cookies.get('auth_status');
    const isLoggedIn = authStatus?.value === 'true';
    const { pathname } = request.nextUrl;

    // 1. Redirect Authenticated Users away from Auth Pages
    if (isLoggedIn) {
        if (pathname === '/login' || pathname === '/signup') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    // 2. Strict Route Protection
    // Whitelist public routes. Block everything else.
    const publicRoutes = ['/', '/login', '/signup', '/register', '/tickets', '/culturals', '/team', '/foodstalls', '/transport'];
    const isPublic = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

    if (!isLoggedIn && !isPublic) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public scope
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
