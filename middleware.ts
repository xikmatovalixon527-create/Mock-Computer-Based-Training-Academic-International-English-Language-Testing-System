import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Exclude non-app routes (API, static files, auth pages)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/setup' // Fallback setup page
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  // Route protection by role
  if (pathname.startsWith('/student') && payload.role !== 'student') {
    return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
  }
  
  if (pathname.startsWith('/teacher') && payload.role !== 'teacher') {
    return NextResponse.redirect(new URL('/student/dashboard', request.url));
  }
  
  // Redirect root to corresponding dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${payload.role}/dashboard`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
