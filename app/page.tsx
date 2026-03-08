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
  if (value == null) return <span className="text-gray-600">---</span>
  return (
    <span className={value >= 0 ? 'text-emerald-400' : 'text-red-400'}>
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
        className="w-28 text-right bg-gray-800 text-white font-mono text-sm tabular-nums rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
        style={{ color: '#e87800' }}
      />
    )
  }
  return (
    <span
      onClick={startEdit}
      title="Click to edit"
      className="tabular-nums cursor-pointer hover:text-white transition-colors text-gray-400"
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
      <main className="min-h-screen pb-24 relative z-10">
        <div className="max-w-5xl mx-auto px-6 py-10">

          {portfolios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-48 text-gray-600 uppercase tracking-widest">
              <p>// NO PORTFOLIOS //</p>
              <p className="text-sm mt-2">CREATE ONE BELOW</p>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {portfolios.map(p => {
                const myHoldings = holdings.filter(h => h.portfolioId === p.id)
                const value = portfolioValue(p.id)

                return (
                  <section key={p.id}>
                    {/* Portfolio header */}
                    <div className="group flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl uppercase tracking-widest text-white">{p.name}</h2>
                          <button
                            onClick={() => removePortfolio(p.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-sm"
                          >[ X ]</button>
                        </div>
                        <p className="text-xs text-gray-600 uppercase tracking-widest mt-0.5">TOTAL VALUE</p>
                        <p className="text-3xl lcd tabular-nums">{formatValue(value, currency)}</p>
                      </div>
                    </div>

                    {/* Table panel */}
                    <div className="panel rounded-sm overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="text-xs text-gray-600 uppercase tracking-widest border-b border-dashed border-gray-700">
                            <th className="text-left py-2 pl-4">TOKEN</th>
                            <th className="text-right py-2 pr-4">AMOUNT</th>
                            <th className="text-right py-2 pr-4">PRICE</th>
                            <th className="text-right py-2 pr-4">1H</th>
                            <th className="text-right py-2 pr-4">24H</th>
                            <th className="text-right py-2 pr-4">VALUE</th>
                            <th className="py-2 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {myHoldings.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-gray-600 uppercase tracking-widest text-xs">
                                // NO TOKENS //
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
                                className={`group/row hover:bg-gray-800 transition-colors ${!isLast ? 'border-b border-dashed border-gray-700' : ''}`}
                              >
                                <td className="pl-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {pd?.image ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={pd.image} alt={pd.name} width={22} height={22} className="rounded-full flex-shrink-0 opacity-80" />
                                    ) : (
                                      <div className="w-[22px] h-[22px] border border-dashed border-gray-600 flex-shrink-0" />
                                    )}
                                    <div>
                                      <span className="text-white uppercase tracking-wider">{h.symbol}</span>
                                      {pd?.name && <p className="text-xs text-gray-600 leading-tight uppercase tracking-wide">{pd.name}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="text-right pr-4 py-3">
                                  <AmountCell holdingId={h.id} amount={h.amount} onSave={(id, amt) => updateHolding(id, { amount: amt })} />
                                </td>
                                <td className="text-right pr-4 py-3 text-gray-400 tabular-nums">
                                  {pd ? formatPrice(price!, currency) : <span className="text-gray-700">---</span>}
                                </td>
                                <td className="text-right pr-4 py-3 tabular-nums">
                                  <ChangeCell value={pd?.change1h} />
                                </td>
                                <td className="text-right pr-4 py-3 tabular-nums">
                                  <ChangeCell value={pd?.change24h} />
                                </td>
                                <td className="text-right pr-4 py-3 tabular-nums lcd">
                                  {val != null ? formatValue(val, currency) : <span className="text-gray-700" style={{ color: 'inherit', textShadow: 'none', opacity: 0.3 }}>---</span>}
                                </td>
                                <td className="pr-3 py-3 w-8">
                                  <button
                                    onClick={() => removeHolding(h.id)}
                                    className="opacity-0 group-hover/row:opacity-100 text-gray-600 hover:text-red-400 transition-all text-xs"
                                  >[ X ]</button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>

                      {/* Add token row */}
                      <div className="flex justify-end px-3 py-2 border-t border-dashed border-gray-700">
                        <button
                          onClick={() => setAddingTo(p.id)}
                          className="text-gray-600 hover:text-white text-xs uppercase tracking-widest transition-colors px-2 py-1 hover:bg-gray-800"
                        >
                          [ + ADD TOKEN ]
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

      {/* Footer panel */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-dashed border-gray-700" style={{ background: '#0b0e07ee', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-widest">// TOTAL</p>
            <p className="text-xl lcd tabular-nums">{formatValue(grandTotal, currency)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleCurrency}
              className="px-3 py-1 border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 text-sm uppercase tracking-widest transition-colors"
            >
              {currency === 'usd' ? '[ $ USD ]' : '[ £ GBP ]'}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1 border border-dashed border-indigo-600 text-indigo-500 hover:bg-indigo-600 hover:text-gray-950 text-sm uppercase tracking-widest transition-colors"
            >
              [ + NEW PORTFOLIO ]
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
