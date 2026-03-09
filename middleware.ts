import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = '__session'

async function verifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const sigBytes = Uint8Array.from(
      token.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
    )
    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode('authenticated')
    )
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow auth endpoint, lock page, and all API routes without session
  if (
    pathname.startsWith('/lock') ||
    pathname.startsWith('/api/')
  ) {
    const res = NextResponse.next()
    res.headers.set('x-mw', 'v2')
    return res
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  const secret = process.env.COOKIE_SECRET ?? ''

  if (token && await verifyToken(token, secret)) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/lock', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/data).*)'],
}
