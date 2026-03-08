import { NextRequest, NextResponse } from 'next/server'

interface PriceEntry {
  price: number
  change24h: number
  ts: number
}

interface CoinCapAsset {
  symbol: string
  priceUsd: string
  changePercent24Hr: string
  rank: string
}

// In-memory cache — survives across requests in the same serverless instance
const cache = new Map<string, PriceEntry>()
const CACHE_TTL = 60_000

async function fetchPrice(symbol: string): Promise<Omit<PriceEntry, 'ts'> | null> {
  const cached = cache.get(symbol)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { price: cached.price, change24h: cached.change24h }
  }

  try {
    const res = await fetch(
      `https://rest.coincap.io/v2/assets?search=${encodeURIComponent(symbol)}&limit=20`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    const assets: CoinCapAsset[] = json.data ?? []

    const match = assets
      .filter(a => a.symbol.toUpperCase() === symbol.toUpperCase())
      .sort((a, b) => Number(a.rank) - Number(b.rank))[0]

    if (!match) return null

    const price = parseFloat(match.priceUsd)
    const change24h = parseFloat(match.changePercent24Hr)

    cache.set(symbol, { price, change24h, ts: Date.now() })
    return { price, change24h }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols') ?? ''
  const symbols = [...new Set(
    symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  )]

  if (symbols.length === 0) return NextResponse.json({})

  const entries = await Promise.all(
    symbols.map(async sym => [sym, await fetchPrice(sym)] as const)
  )

  const out: Record<string, { price: number; change24h: number }> = {}
  for (const [sym, data] of entries) {
    if (data) out[sym] = data
  }

  return NextResponse.json(out)
}
