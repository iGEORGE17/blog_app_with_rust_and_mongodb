// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  // Define routes that require authentication
  const isProtectedRoute = pathname.startsWith('/posts/new') || pathname.startsWith('/profile')

  if (isProtectedRoute && !token) {
    // Redirect to sign-in, saving the current URL to return later
    const url = new URL('/auth/signin', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Only run middleware on these specific paths
export const config = {
  matcher: ['/posts/new/:path*', '/profile/:path*'],
}