'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePortfolioStore, useInitStore } from '@/store/portfolioStore'
import CreatePortfolioModal from '@/components/CreatePortfolioModal'
import AddHoldingModal from '@/components/AddHoldingModal'
import { formatPrice, formatValue, formatAmount, formatChange } from '@/lib/format'
import type { PriceData } from '@/app/api/prices/route'

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
    <span className={value >= 0 ? 'text-emerald-400' : 'text-red-400'}>
      {formatChange(value)}
    </span>
  )
}

export default function Home() {
  useInitStore()
  const { portfolios, holdings, addPortfolio, removePortfolio, addHolding, removeHolding } = usePortfolioStore()
  const [showCreate, setShowCreate] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const allSymbols = mounted ? [...new Set(holdings.map(h => h.symbol))] : []
  const prices = usePrices(allSymbols)

  if (!mounted) return null

  const portfolioValue = (portfolioId: string) =>
    holdings
      .filter(h => h.portfolioId === portfolioId)
      .reduce((sum, h) => sum + (prices[h.symbol]?.price != null ? h.amount * prices[h.symbol].price : 0), 0)

  const grandTotal = portfolios.reduce((sum, p) => sum + portfolioValue(p.id), 0)

  return (
    <>
      <main className="min-h-screen bg-gray-950 text-white pb-20">
        <div className="max-w-5xl mx-auto px-6 py-12">

          {portfolios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-48 text-gray-600">
              <p className="text-lg">No portfolios yet</p>
              <p className="text-sm mt-1">Create one below to get started</p>
            </div>
          ) : (
            <div className="flex flex-col gap-14">
              {portfolios.map(p => {
                const myHoldings = holdings.filter(h => h.portfolioId === p.id)
                const value = portfolioValue(p.id)

                return (
                  <section key={p.id}>
                    {/* Portfolio header */}
                    <div className="group flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-bold tracking-tight text-white">{p.name}</h2>
                          <button
                            onClick={() => removePortfolio(p.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all text-xs mt-1"
                            title="Delete portfolio"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Total Value</p>
                        <p className="text-3xl font-bold text-white tabular-nums">{formatValue(value)}</p>
                      </div>
                    </div>

                    {/* Holdings table */}
                    <div className="w-full overflow-x-auto rounded-xl border border-gray-800">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="text-xs text-gray-600 uppercase tracking-wider border-b border-gray-800">
                            <th className="text-left py-3 pl-4">Token</th>
                            <th className="text-right py-3 pr-4">Amount</th>
                            <th className="text-right py-3 pr-4">Price</th>
                            <th className="text-right py-3 pr-4">1h</th>
                            <th className="text-right py-3 pr-4">24h</th>
                            <th className="text-right py-3 pr-4">Value</th>
                            <th className="py-3 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {myHoldings.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-gray-600 text-sm">
                                No tokens — add one below
                              </td>
                            </tr>
                          ) : (
                            myHoldings.map((h, i) => {
                              const p2 = prices[h.symbol]
                              const val = p2 != null ? h.amount * p2.price : null
                              const isLast = i === myHoldings.length - 1

                              return (
                                <tr
                                  key={h.id}
                                  className={`group/row hover:bg-gray-900/60 transition-colors ${!isLast ? 'border-b border-gray-800/50' : ''}`}
                                >
                                  <td className="pl-4 py-3.5">
                                    <div className="flex items-center gap-3">
                                      {p2?.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={p2.image} alt={p2.name} width={26} height={26} className="rounded-full flex-shrink-0" />
                                      ) : (
                                        <div className="w-[26px] h-[26px] rounded-full bg-gray-800 flex-shrink-0" />
                                      )}
                                      <div>
                                        <span className="font-semibold text-white text-sm">{h.symbol}</span>
                                        {p2?.name && <p className="text-xs text-gray-500 leading-tight">{p2.name}</p>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-right pr-4 py-3.5 text-gray-400 font-mono text-sm tabular-nums">
                                    {formatAmount(h.amount)}
                                  </td>
                                  <td className="text-right pr-4 py-3.5 text-gray-300 font-mono text-sm tabular-nums">
                                    {p2 ? formatPrice(p2.price) : <span className="text-gray-600">—</span>}
                                  </td>
                                  <td className="text-right pr-4 py-3.5 font-mono text-sm tabular-nums">
                                    <ChangeCell value={p2?.change1h} />
                                  </td>
                                  <td className="text-right pr-4 py-3.5 font-mono text-sm tabular-nums">
                                    <ChangeCell value={p2?.change24h} />
                                  </td>
                                  <td className="text-right pr-4 py-3.5 text-white font-mono text-sm tabular-nums">
                                    {val != null ? formatValue(val) : <span className="text-gray-600">—</span>}
                                  </td>
                                  <td className="pr-3 py-3.5 w-8">
                                    <button
                                      onClick={() => removeHolding(h.id)}
                                      className="opacity-0 group-hover/row:opacity-100 text-gray-600 hover:text-red-400 transition-all text-xs"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>

                      {/* Add token — bottom right of table */}
                      <div className="flex justify-end px-3 py-2 border-t border-gray-800/50">
                        <button
                          onClick={() => setAddingTo(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-white text-xs font-medium transition-colors rounded-lg hover:bg-gray-800"
                        >
                          <span className="text-sm leading-none">+</span> Add Token
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

      {/* Sticky footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur border-t border-gray-800 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider">Total</p>
            <p className="text-white font-bold text-lg tabular-nums">{formatValue(grandTotal)}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <span className="text-base leading-none">+</span> New Portfolio
          </button>
        </div>
      </footer>

      {showCreate && (
        <CreatePortfolioModal
          onClose={() => setShowCreate(false)}
          onCreate={name => addPortfolio(name)}
        />
      )}

      {addingTo && (
        <AddHoldingModal
          onClose={() => setAddingTo(null)}
          onAdd={(symbol, amount) => addHolding(addingTo, symbol, amount)}
        />
      )}
    </>
  )
}
