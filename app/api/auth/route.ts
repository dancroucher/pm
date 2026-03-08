import { NextRequest, NextResponse } from 'next/server'

async function generateToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode('authenticated')
  )
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export async function POST(request: NextRequest) {
  const expected = process.env.PASSCODE ?? ''
  const secret = process.env.COOKIE_SECRET ?? ''

  if (!expected || !secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  let passcode: string
  try {
    const body = await request.json()
    passcode = String(body.passcode ?? '')
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  if (!/^\d{4}$/.test(passcode) || !timingSafeEqual(passcode, expected)) {
    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 })
  }

  const token = await generateToken(secret)

  const response = NextResponse.json({ success: true })
  response.cookies.set('__session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}
