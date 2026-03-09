'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePortfolioStore, useInitStore } from '@/store/portfolioStore'
import CreatePortfolioModal from '@/components/CreatePortfolioModal'
import AddHoldingModal from '@/components/AddHoldingModal'
import { formatPrice, formatValue, formatAmount, formatChange } from '@/lib/format'
import type { Currency } from '@/lib/format'
import type { PriceData } from '@/app/api/prices/route'

const CURRENCY_KEY = 'jeem-folio-currency'
const SNAPSHOT_KEY = 'jeem-folio-snapshot'
const SNAPSHOT_TTL = 24 * 60 * 60 * 1000

interface Snapshot {
  ts: number
  prices: Record<string, { usd: number; gbp: number }>
}

function useSnapshot(prices: Record<string, PriceData>) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY)
      if (raw) setSnapshot(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (Object.keys(prices).length === 0) return
    const now = Date.now()
    const isStale = !snapshot || now - snapshot.ts >= SNAPSHOT_TTL
    if (isStale) {
      const next: Snapshot = {
        ts: now,
        prices: Object.fromEntries(Object.entries(prices).map(([sym, p]) => [sym, { usd: p.usd, gbp: p.gbp }])),
      }
      setSnapshot(next)
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices])

  const reset = useCallback(() => {
    if (Object.keys(prices).length === 0) return
    const next: Snapshot = {
      ts: Date.now(),
      prices: Object.fromEntries(Object.entries(prices).map(([sym, p]) => [sym, { usd: p.usd, gbp: p.gbp }])),
    }
    setSnapshot(next)
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next))
  }, [prices])

  return { snapshot, reset }
}

function useCurrency(): [Currency, () => void] {
  const [currency, setCurrency] = useState<Currency>('usd')
  useEffect(() => {
    const saved = localStorage.getItem(CURRENCY_KEY)
    if (saved === 'gbp' || saved === 'usd') setCurrency(saved)
  }, [])
  const toggle = useCallback(() => {
    setCurrency(c => {
      const next: Currency = c === 'usd' ? 'gbp' : 'usd'
      localStorage.setItem(CURRENCY_KEY, next)
      return next
    })
  }, [])
  return [currency, toggle]
}

function usePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [loading, setLoading] = useState(false)
  const key = symbols.join(',')
  const fetchPrices = useCallback(async (force = false) => {
    if (!key) return
    setLoading(true)
    try {
      const url = force ? `/api/prices?symbols=${key}&force=1` : `/api/prices?symbols=${key}`
      const res = await fetch(url)
      if (res.ok) setPrices(await res.json())
    } catch {}
    finally { setLoading(false) }
  }, [key])
  useEffect(() => {
    fetchPrices(false)
    const id = setInterval(() => fetchPrices(false), 60_000)
    return () => clearInterval(id)
  }, [fetchPrices])
  return { prices, loading, refresh: () => fetchPrices(true) }
}

function RefreshButton({ onClick, spinning }: { onClick: () => void; spinning: boolean }) {
  return (
    <button
      onClick={onClick}
      title="Refresh prices"
      className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-800"
    >
      <svg
        className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M23 4v6h-6" />
        <path d="M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </button>
  )
}

function ChangeCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-gray-600">—</span>
  return (
    <span className={`font-medium ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {formatChange(value)}
    </span>
  )
}

function AmountCell({ holdingId, amount, onSave }: {
  holdingId: string; amount: number; onSave: (id: string, amount: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setVal(amount.toString())
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }
  const commit = () => {
    const parsed = parseFloat(val)
    if (!isNaN(parsed) && parsed > 0) onSave(holdingId, parsed)
    setEditing(false)
  }
  const cancel = () => setEditing(false)

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={val}
        min="0"
        step="any"
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
        className="w-28 text-right bg-gray-700 text-white text-sm tabular-nums rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
      />
    )
  }
  return (
    <span
      onClick={startEdit}
      title="Click to edit"
      className="text-gray-400 text-sm tabular-nums cursor-pointer hover:text-white transition-colors"
    >
      {formatAmount(amount)}
    </span>
  )
}

function CostBasisCell({ portfolioId, costBasisGbp, onSave, currency, gbpPerUsd }: {
  portfolioId: string; costBasisGbp?: number; onSave: (id: string, v: number | undefined) => void
  currency: Currency; gbpPerUsd: number
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const displayValue = costBasisGbp != null
    ? (currency === 'gbp' ? costBasisGbp : costBasisGbp / gbpPerUsd)
    : undefined

  const startEdit = () => {
    setVal(displayValue != null ? displayValue.toFixed(2) : '')
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }
  const commit = () => {
    const parsed = parseFloat(val)
    if (isNaN(parsed) || parsed < 0) {
      onSave(portfolioId, undefined)
    } else {
      const asGbp = currency === 'gbp' ? parsed : parsed * gbpPerUsd
      onSave(portfolioId, asGbp)
    }
    setEditing(false)
  }
  const cancel = () => setEditing(false)

  const sym = currency === 'gbp' ? '£' : '$'

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={val}
        min="0"
        step="any"
        placeholder="0"
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
        className="w-32 bg-gray-700 text-white text-sm tabular-nums rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      title="Click to set cost basis"
      className="text-gray-500 text-sm tabular-nums cursor-pointer hover:text-gray-300 transition-colors"
    >
      {displayValue != null
        ? `Cost ${sym}${displayValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
        : <span className="text-gray-600 text-xs">+ cost basis</span>}
    </span>
  )
}

export default function Home() {
  useInitStore()
  const { portfolios, holdings, addPortfolio, removePortfolio, addHolding, removeHolding, updateHolding, updatePortfolio } = usePortfolioStore()
  const [showCreate, setShowCreate] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [currency, toggleCurrency] = useCurrency()
  const [confirmPortfolio, setConfirmPortfolio] = useState<string | null>(null)
  const [confirmHolding, setConfirmHolding] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  const allSymbols = mounted ? [...new Set(holdings.map(h => h.symbol))] : []
  const { prices, loading, refresh } = usePrices(allSymbols)
  const { snapshot, reset: resetSnapshot } = useSnapshot(prices)
  if (!mounted) return null

  const snapshotAge = snapshot ? (() => {
    const hrs = (Date.now() - snapshot.ts) / 3_600_000
    if (hrs < 1) return `${Math.round(hrs * 60)}m ago`
    if (hrs < 24) return `${Math.round(hrs)}h ago`
    return `${Math.round(hrs / 24)}d ago`
  })() : null

  const priceIn = (p: PriceData) => currency === 'gbp' ? p.gbp : p.usd
  const gbpPerUsd = (() => {
    const pd = Object.values(prices).find(p => p.usd > 0 && p.gbp > 0)
    return pd ? pd.gbp / pd.usd : 0.79
  })()
  const portfolioValue = (portfolioId: string) =>
    holdings.filter(h => h.portfolioId === portfolioId)
      .reduce((sum, h) => { const p = prices[h.symbol]; return sum + (p != null ? h.amount * priceIn(p) : 0) }, 0)
  const grandTotal = portfolios.reduce((sum, p) => sum + portfolioValue(p.id), 0)

  return (
    <>
      <main className="min-h-screen pb-24">
        <div className="max-w-5xl mx-auto px-6 py-10">

          {portfolios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-48 text-gray-600">
              <p className="text-lg font-medium">No portfolios yet</p>
              <p className="text-sm mt-1 text-gray-600">Create one below to get started</p>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {portfolios.map(p => {
                const myHoldings = holdings.filter(h => h.portfolioId === p.id)
                const value = portfolioValue(p.id)

                return (
                  <section key={p.id}>
                    {/* Portfolio header */}
                    <div className="group flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-semibold tracking-tight text-white">{p.name}</h2>
                          {confirmPortfolio === p.id ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <span className="text-gray-400">Delete?</span>
                              <button onClick={() => { removePortfolio(p.id); setConfirmPortfolio(null) }} className="text-red-400 hover:text-red-300 font-medium">Yes</button>
                              <button onClick={() => setConfirmPortfolio(null)} className="text-gray-500 hover:text-gray-300">No</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmPortfolio(p.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-sm"
                            >✕</button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wider">Total Value</p>
                        <p className="text-3xl font-bold text-white tabular-nums mt-0.5">{formatValue(value, currency)}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <CostBasisCell
                            portfolioId={p.id}
                            costBasisGbp={p.costBasisGbp}
                            onSave={(id, v) => updatePortfolio(id, { costBasisGbp: v })}
                            currency={currency}
                            gbpPerUsd={gbpPerUsd}
                          />
                          {p.costBasisGbp != null && (() => {
                            const costInCurrency = currency === 'gbp' ? p.costBasisGbp : p.costBasisGbp / gbpPerUsd
                            const pl = value - costInCurrency
                            const pct = (pl / costInCurrency) * 100
                            const pos = pl >= 0
                            return (
                              <span className={`text-sm font-medium tabular-nums ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                                {pos ? '+' : ''}{formatValue(pl, currency)} ({pos ? '+' : ''}{pct.toFixed(2)}%)
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="bg-gray-900 rounded-2xl overflow-hidden">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                            <th className="text-left py-3 pl-5 font-medium">Token</th>
                            <th className="text-right py-3 pr-5 font-medium">Amount</th>
                            <th className="text-right py-3 pr-5 font-medium">Price</th>
                            <th className="text-right py-3 pr-5 font-medium">1h</th>
                            <th className="text-right py-3 pr-5 font-medium">24h</th>
                            <th className="text-right py-3 pr-5 font-medium">Value</th>
                            <th className="text-right py-3 pr-5 font-medium">
                              <button
                                onClick={resetSnapshot}
                                title="Reset snapshot baseline"
                                className="normal-case tracking-normal font-normal text-gray-600 hover:text-gray-400 transition-colors"
                              >
                                {snapshotAge ? `vs ${snapshotAge} ↺` : 'Gain/Loss'}
                              </button>
                            </th>
                            <th className="py-3 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {myHoldings.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-10 text-center text-gray-600 text-sm">
                                No tokens yet
                              </td>
                            </tr>
                          ) : myHoldings.map((h, i) => {
                            const pd = prices[h.symbol]
                            const price = pd != null ? priceIn(pd) : null
                            const val = price != null ? h.amount * price : null
                            const isLast = i === myHoldings.length - 1
                            const snapPrice = snapshot?.prices[h.symbol]
                            const snapVal = snapPrice != null ? h.amount * (currency === 'gbp' ? snapPrice.gbp : snapPrice.usd) : null
                            const snapDelta = val != null && snapVal != null ? val - snapVal : null

                            return (
                              <tr
                                key={h.id}
                                className={`group/row hover:bg-gray-800 transition-colors ${!isLast ? 'border-b border-gray-800' : ''}`}
                              >
                                <td className="pl-5 py-4">
                                  <div className="flex items-center gap-3">
                                    {pd?.image ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={pd.image} alt={pd.name} width={36} height={36} className="rounded-full flex-shrink-0" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-xs text-gray-500 font-bold">
                                        {h.symbol.slice(0, 2)}
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-semibold text-white text-sm">{h.symbol}</p>
                                      {pd?.name && <p className="text-xs text-gray-500 leading-tight">{pd.name}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="text-right pr-5 py-4">
                                  <AmountCell holdingId={h.id} amount={h.amount} onSave={(id, amt) => updateHolding(id, { amount: amt })} />
                                </td>
                                <td className="text-right pr-5 py-4 text-gray-300 text-sm tabular-nums">
                                  {pd ? formatPrice(price!, currency) : <span className="text-gray-600">—</span>}
                                </td>
                                <td className="text-right pr-5 py-4 text-sm tabular-nums">
                                  <ChangeCell value={pd?.change1h} />
                                </td>
                                <td className="text-right pr-5 py-4 text-sm tabular-nums">
                                  <ChangeCell value={pd?.change24h} />
                                </td>
                                <td className="text-right pr-5 py-4 text-white font-semibold text-sm tabular-nums">
                                  {val != null ? formatValue(val, currency) : <span className="text-gray-600">—</span>}
                                </td>
                                <td className="text-right pr-5 py-4 text-sm tabular-nums">
                                  {snapDelta != null
                                    ? <span className={`font-medium ${snapDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {snapDelta >= 0 ? '+' : ''}{formatValue(snapDelta, currency)}
                                      </span>
                                    : <span className="text-gray-600">—</span>}
                                </td>
                                <td className="pr-4 py-4 w-20 text-right">
                                  {confirmHolding === h.id ? (
                                    <span className="flex items-center justify-end gap-1.5 text-xs">
                                      <button onClick={() => { removeHolding(h.id); setConfirmHolding(null) }} className="text-red-400 hover:text-red-300 font-medium">Yes</button>
                                      <button onClick={() => setConfirmHolding(null)} className="text-gray-500 hover:text-gray-300">No</button>
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmHolding(h.id)}
                                      className="opacity-0 group-hover/row:opacity-100 text-gray-600 hover:text-red-400 transition-all text-xs"
                                    >✕</button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>

                      {/* Add token */}
                      <div className="flex justify-end px-4 py-3 border-t border-gray-800">
                        <button
                          onClick={() => setAddingTo(p.id)}
                          className="text-gray-500 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-700 flex items-center gap-1.5"
                        >
                          <span className="text-base leading-none">+</span> Add Token
                        </button>
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900/90 backdrop-blur-md border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-white tabular-nums">{formatValue(grandTotal, currency)}</p>
              <RefreshButton onClick={refresh} spinning={loading} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCurrency}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium rounded-xl transition-colors"
            >
              {currency === 'usd' ? '$ USD' : '£ GBP'}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <span className="text-base leading-none">+</span> New Portfolio
            </button>
          </div>
        </div>
      </footer>

      {showCreate && (
        <CreatePortfolioModal
          onClose={() => setShowCreate(false)}
          onCreate={(name, holdings) => {
            const p = addPortfolio(name)
            holdings?.forEach(h => addHolding(p.id, h.symbol, h.amount))
          }}
        />
      )}
      {addingTo && (
        <AddHoldingModal onClose={() => setAddingTo(null)} onAdd={(symbol, amount) => addHolding(addingTo, symbol, amount)} />
      )}
    </>
  )
}
