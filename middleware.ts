import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasToken = request.cookies.has('access_token')

  if (pathname === '/') {
    const destination = hasToken ? '/dashboard' : '/login'
    const url = request.nextUrl.clone()
    url.pathname = destination
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login
     * - /callback
     * - /api (all API routes)
     * - /_next (Next.js internals)
     * - /favicon.ico
     * - static files (images, fonts, etc.)
     */
    '/((?!login|callback|api|_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)',
  ],
}
