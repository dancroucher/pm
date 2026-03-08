'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePortfolioStore, useInitStore } from '@/store/portfolioStore'
import CreatePortfolioModal from '@/components/CreatePortfolioModal'
import AddHoldingModal from '@/components/AddHoldingModal'
import { formatPrice, formatValue, formatAmount, formatChange } from '@/lib/format'
import type { Currency } from '@/lib/format'
import type { PriceData } from '@/app/api/prices/route'

const CURRENCY_KEY = 'jeem-folio-currency'

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
  const key = symbols.join(',')
  const fetchPrices = useCallback(async () => {
    if (!key) return
    try {
      const res = await fetch(`/api/prices?symbols=${key}`)
      if (res.ok) setPrices(await res.json())
    } catch {}
  }, [key])
  useEffect(() => {
    fetchPrices()
    const id = setInterval(fetchPrices, 60_000)
    return () => clearInterval(id)
  }, [fetchPrices])
  return prices
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

export default function Home() {
  useInitStore()
  const { portfolios, holdings, addPortfolio, removePortfolio, addHolding, removeHolding, updateHolding } = usePortfolioStore()
  const [showCreate, setShowCreate] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [currency, toggleCurrency] = useCurrency()

  useEffect(() => setMounted(true), [])

  const allSymbols = mounted ? [...new Set(holdings.map(h => h.symbol))] : []
  const prices = usePrices(allSymbols)
  if (!mounted) return null

  const priceIn = (p: PriceData) => currency === 'gbp' ? p.gbp : p.usd
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
                          <button
                            onClick={() => removePortfolio(p.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-sm"
                          >✕</button>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wider">Total Value</p>
                        <p className="text-3xl font-bold text-white tabular-nums mt-0.5">{formatValue(value, currency)}</p>
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
                            <th className="py-3 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {myHoldings.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-10 text-center text-gray-600 text-sm">
                                No tokens yet
                              </td>
                            </tr>
                          ) : myHoldings.map((h, i) => {
                            const pd = prices[h.symbol]
                            const price = pd != null ? priceIn(pd) : null
                            const val = price != null ? h.amount * price : null
                            const isLast = i === myHoldings.length - 1

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
                                <td className="pr-4 py-4 w-8">
                                  <button
                                    onClick={() => removeHolding(h.id)}
                                    className="opacity-0 group-hover/row:opacity-100 text-gray-600 hover:text-red-400 transition-all text-xs"
                                  >✕</button>
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
            <p className="text-xl font-bold text-white tabular-nums">{formatValue(grandTotal, currency)}</p>
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
        <CreatePortfolioModal onClose={() => setShowCreate(false)} onCreate={name => addPortfolio(name)} />
      )}
      {addingTo && (
        <AddHoldingModal onClose={() => setAddingTo(null)} onAdd={(symbol, amount) => addHolding(addingTo, symbol, amount)} />
      )}
    </>
  )
}
