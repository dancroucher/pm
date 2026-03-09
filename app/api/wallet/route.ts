import { NextResponse } from 'next/server'

interface JupiterToken {
  address: string
  symbol: string
  name: string
  decimals: number
}

let jupiterCache: { tokens: Record<string, { symbol: string; name: string }>; ts: number } | null = null

export async function GET() {
  if (jupiterCache && Date.now() - jupiterCache.ts < 3_600_000) {
    return NextResponse.json(jupiterCache.tokens)
  }
  const res = await fetch('https://token.jup.ag/strict', { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({}, { status: 502 })
  const list: JupiterToken[] = await res.json()
  const tokens = Object.fromEntries(list.map(t => [t.address, { symbol: t.symbol.toUpperCase(), name: t.name }]))
  jupiterCache = { tokens, ts: Date.now() }
  return NextResponse.json(tokens)
}
