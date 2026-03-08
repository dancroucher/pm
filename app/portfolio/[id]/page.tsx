'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { usePortfolioStore, useInitStore } from '@/store/portfolioStore'
import AddHoldingModal from '@/components/AddHoldingModal'
import { formatPrice, formatValue, formatAmount, formatChange } from '@/lib/format'
import type { PriceData } from '@/app/api/prices/route'

function usePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [loading, setLoading] = useState(false)
  const key = symbols.join(',')

  const fetchPrices = useCallback(async () => {
    if (!key) return
    setLoading(true)
    try {
      const res = await fetch(`/api/prices?symbols=${key}`)
      if (res.ok) setPrices(await res.json())
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    fetchPrices()
    const id = setInterval(fetchPrices, 60_000)
    return () => clearInterval(id)
  }, [fetchPrices])

  return { prices, loading }
}

function ChangeCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-600">—</span>
  return (
    <span className={value >= 0 ? 'text-emerald-400' : 'text-red-400'}>
      {formatChange(value)}
    </span>
  )
}

export default function PortfolioPage() {
  useInitStore()
  const { id } = useParams<{ id: string }>()
  const { portfolios, holdings, addHolding, removeHolding } = usePortfolioStore()
  const [showAdd, setShowAdd] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const portfolio = portfolios.find(p => p.id === id)
  const myHoldings = holdings.filter(h => h.portfolioId === id)
  const symbols = [...new Set(myHoldings.map(h => h.symbol))]
  const { prices, loading } = usePrices(mounted ? symbols : [])

  const totalValue = myHoldings.reduce((sum, h) => {
    const p = prices[h.symbol]?.price
    return sum + (p != null ? h.amount * p : 0)
  }, 0)

  if (!mounted) return null

  if (!portfolio) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Portfolio not found</p>
          <Link href="/" className="text-indigo-400 text-sm mt-2 inline-block hover:text-indigo-300">← Back</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="text-gray-500 hover:text-white transition-colors text-sm">← Portfolios</Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-2xl font-bold tracking-tight">{portfolio.name}</h1>
          <div className="ml-auto">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <span className="text-lg leading-none">+</span> Add Token
            </button>
          </div>
        </div>

        {/* Total value */}
        <div className="mb-10">
          <p className="text-gray-500 text-sm">Total Value</p>
          <p className="text-3xl font-bold text-white mt-1">
            {loading && myHoldings.length > 0 && totalValue === 0
              ? <span className="text-gray-600 text-2xl">Loading…</span>
              : formatValue(totalValue)
            }
          </p>
        </div>

        {myHoldings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-600">
            <p className="text-lg">No tokens yet</p>
            <p className="text-sm mt-1">Add your first holding</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-xs text-gray-600 uppercase tracking-wider">
                  <th className="text-left pb-3 pl-4">Token</th>
                  <th className="text-right pb-3 pr-4">Amount</th>
                  <th className="text-right pb-3 pr-4">Price</th>
                  <th className="text-right pb-3 pr-4">1h</th>
                  <th className="text-right pb-3 pr-4">24h</th>
                  <th className="text-right pb-3 pr-4">Value</th>
                  <th className="pb-3 w-8" />
                </tr>
              </thead>
              <tbody className="space-y-2">
                {myHoldings.map(h => {
                  const p = prices[h.symbol]
                  const value = p != null ? h.amount * p.price : null

                  return (
                    <tr
                      key={h.id}
                      className="group bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
                    >
                      {/* Token: icon + symbol + name */}
                      <td className="pl-4 py-4 rounded-l-xl">
                        <div className="flex items-center gap-3">
                          {p?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.name} width={28} height={28} className="rounded-full flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gray-800 flex-shrink-0" />
                          )}
                          <div>
                            <span className="font-semibold text-white text-sm">{h.symbol}</span>
                            {p?.name && <p className="text-xs text-gray-500 leading-tight">{p.name}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="text-right pr-4 py-4 text-gray-400 font-mono text-sm tabular-nums">
                        {formatAmount(h.amount)}
                      </td>

                      {/* Price */}
                      <td className="text-right pr-4 py-4 text-gray-300 font-mono text-sm tabular-nums">
                        {loading && !p ? <span className="text-gray-600">—</span> : p ? formatPrice(p.price) : <span className="text-gray-600">—</span>}
                      </td>

                      {/* 1h */}
                      <td className="text-right pr-4 py-4 font-mono text-sm tabular-nums">
                        <ChangeCell value={p?.change1h ?? null} />
                      </td>

                      {/* 24h */}
                      <td className="text-right pr-4 py-4 font-mono text-sm tabular-nums">
                        <ChangeCell value={p?.change24h ?? null} />
                      </td>

                      {/* Value */}
                      <td className="text-right pr-4 py-4 text-white font-mono text-sm tabular-nums">
                        {value != null ? formatValue(value) : <span className="text-gray-600">—</span>}
                      </td>

                      {/* Delete */}
                      <td className="pr-3 py-4 rounded-r-xl">
                        <button
                          onClick={() => removeHolding(h.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-xs"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {myHoldings.length > 1 && (
                <tfoot>
                  <tr className="border-t border-gray-800">
                    <td colSpan={5} className="pt-3 pl-4 text-gray-500 text-sm">Total</td>
                    <td className="pt-3 pr-4 text-right text-white font-semibold font-mono text-sm tabular-nums">
                      {formatValue(totalValue)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddHoldingModal
          onClose={() => setShowAdd(false)}
          onAdd={(symbol, amount) => addHolding(id, symbol, amount)}
        />
      )}
    </main>
  )
}
