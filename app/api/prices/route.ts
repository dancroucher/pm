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

export interface PriceData {
  price: number
  change1h: number | null
  change24h: number
  name: string
  image: string
}

interface CacheEntry extends PriceData { ts: number }

interface GeckoSearchCoin {
  id: string
  symbol: string
  market_cap_rank: number | null
}

interface GeckoMarket {
  id: string
  name: string
  image: string
  current_price: number
  price_change_percentage_1h_in_currency: number | null
  price_change_percentage_24h_in_currency: number | null
  price_change_percentage_24h: number | null
}

const priceCache = new Map<string, CacheEntry>()
const idLookupCache = new Map<string, string>()
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

  const now = Date.now()
  const result: Record<string, PriceData> = {}
  const needFetch: string[] = []

  for (const sym of symbols) {
    const entry = priceCache.get(sym)
    if (entry && now - entry.ts < CACHE_TTL) {
      const { ts: _ts, ...data } = entry
      result[sym] = data
    } else {
      needFetch.push(sym)
    }
  }

  if (needFetch.length === 0) return NextResponse.json(result)

  // Resolve symbols → CoinGecko IDs
  const idEntries = await Promise.all(
    needFetch.map(async sym => [sym, await resolveId(sym)] as const)
  )
  const symToId = Object.fromEntries(
    idEntries.filter(([, id]) => id != null)
  ) as Record<string, string>
  const ids = [...new Set(Object.values(symToId))]

  if (ids.length === 0) return NextResponse.json(result)

  try {
    const url =
      `https://api.coingecko.com/api/v3/coins/markets` +
      `?vs_currency=usd` +
      `&ids=${ids.join(',')}` +
      `&price_change_percentage=1h,24h` +
      `&per_page=250`

    const res = await fetch(url)
    if (!res.ok) return NextResponse.json(result)

    const markets: GeckoMarket[] = await res.json()
    const byId = Object.fromEntries(markets.map(m => [m.id, m]))

    for (const [sym, geckoId] of Object.entries(symToId)) {
      const m = byId[geckoId]
      if (!m) continue
      const data: PriceData = {
        price: m.current_price,
        change1h: m.price_change_percentage_1h_in_currency ?? null,
        change24h: m.price_change_percentage_24h_in_currency ?? m.price_change_percentage_24h ?? 0,
        name: m.name,
        image: m.image,
      }
      priceCache.set(sym, { ...data, ts: now })
      result[sym] = data
    }
  } catch {
    // return whatever we have
  }

  return NextResponse.json(result)
}
