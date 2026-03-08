import { NextRequest, NextResponse } from 'next/server'

// CoinGecko uses IDs (e.g. "bitcoin") not symbols (e.g. "BTC")
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  POL: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  LTC: 'litecoin',
  AVAX: 'avalanche-2',
  ATOM: 'cosmos',
  NEAR: 'near',
  FTM: 'fantom',
  ALGO: 'algorand',
  XLM: 'stellar',
  VET: 'vechain',
  ICP: 'internet-computer',
  FIL: 'filecoin',
  HBAR: 'hedera-hashgraph',
  AAVE: 'aave',
  MKR: 'maker',
  CRV: 'curve-dao-token',
  GRT: 'the-graph',
  BAT: 'basic-attention-token',
  ZEC: 'zcash',
  DASH: 'dash',
  XMR: 'monero',
  USDT: 'tether',
  USDC: 'usd-coin',
  DAI: 'dai',
  BUSD: 'binance-usd',
  SHIB: 'shiba-inu',
  TRX: 'tron',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  SUI: 'sui',
  SEI: 'sei-network',
  INJ: 'injective-protocol',
  TIA: 'celestia',
  TON: 'the-open-network',
  WLD: 'worldcoin-wld',
  IMX: 'immutable-x',
  LDO: 'lido-dao',
  WBTC: 'wrapped-bitcoin',
  STETH: 'staked-ether',
  PEPE: 'pepe',
  BONK: 'bonk',
  WIF: 'dogwifcoin',
  FLOKI: 'floki',
  NOT: 'notcoin',
  COMP: 'compound-governance-token',
  SNX: 'havven',
  YFI: 'yearn-finance',
  SUSHI: 'sushi',
  ENJ: 'enjincoin',
  CHZ: 'chiliz',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  AXS: 'axie-infinity',
  THETA: 'theta-token',
  EOS: 'eos',
}

interface CacheEntry {
  price: number
  change24h: number
  ts: number
}

interface GeckoSearchCoin {
  id: string
  symbol: string
  market_cap_rank: number | null
}

const priceCache = new Map<string, CacheEntry>()
const idLookupCache = new Map<string, string>() // symbol -> geckoId
const CACHE_TTL = 60_000

async function resolveId(symbol: string): Promise<string | null> {
  if (SYMBOL_TO_ID[symbol]) return SYMBOL_TO_ID[symbol]
  if (idLookupCache.has(symbol)) return idLookupCache.get(symbol)!

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`
    )
    if (!res.ok) return null
    const json = await res.json()
    const coins: GeckoSearchCoin[] = json.coins ?? []
    const match = coins
      .filter(c => c.symbol.toUpperCase() === symbol)
      .sort((a, b) => (a.market_cap_rank ?? 99999) - (b.market_cap_rank ?? 99999))[0]

    if (!match) return null
    idLookupCache.set(symbol, match.id)
    return match.id
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

  // Separate cached from uncached
  const now = Date.now()
  const cached: Record<string, { price: number; change24h: number }> = {}
  const needFetch: string[] = []

  for (const sym of symbols) {
    const entry = priceCache.get(sym)
    if (entry && now - entry.ts < CACHE_TTL) {
      cached[sym] = { price: entry.price, change24h: entry.change24h }
    } else {
      needFetch.push(sym)
    }
  }

  if (needFetch.length === 0) return NextResponse.json(cached)

  // Resolve symbols → CoinGecko IDs
  const idEntries = await Promise.all(
    needFetch.map(async sym => [sym, await resolveId(sym)] as const)
  )
  const symToId = Object.fromEntries(idEntries.filter(([, id]) => id != null)) as Record<string, string>
  const ids = [...new Set(Object.values(symToId))]

  if (ids.length === 0) return NextResponse.json(cached)

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`
    )
    if (!res.ok) return NextResponse.json(cached)

    const data: Record<string, { usd: number; usd_24h_change: number }> = await res.json()

    for (const [sym, geckoId] of Object.entries(symToId)) {
      const entry = data[geckoId]
      if (entry) {
        const price = entry.usd
        const change24h = entry.usd_24h_change ?? 0
        priceCache.set(sym, { price, change24h, ts: now })
        cached[sym] = { price, change24h }
      }
    }
  } catch {
    // Return whatever we have cached
  }

  return NextResponse.json(cached)
}
