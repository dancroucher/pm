'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { usePortfolioStore, useInitStore } from '@/store/portfolioStore'
import AddHoldingModal from '@/components/AddHoldingModal'
import { formatPrice, formatValue, formatAmount, formatChange } from '@/lib/format'

interface PriceData {
  price: number
  change24h: number
}

function usePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [loading, setLoading] = useState(false)

  const fetchPrices = useCallback(async () => {
    if (symbols.length === 0) return
    setLoading(true)
    try {
      const res = await fetch(`/api/prices?symbols=${symbols.join(',')}`)
      if (res.ok) setPrices(await res.json())
    } finally {
      setLoading(false)
    }
  }, [symbols.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPrices()
    const id = setInterval(fetchPrices, 60_000)
    return () => clearInterval(id)
  }, [fetchPrices])

  return { prices, loading }
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
          <Link href="/" className="text-indigo-400 text-sm mt-2 inline-block hover:text-indigo-300">
            ← Back
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="text-gray-500 hover:text-white transition-colors text-sm">
            ← Portfolios
          </Link>
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
          <div className="flex flex-col gap-2">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 pb-2 text-xs text-gray-600 uppercase tracking-wider">
              <span>Token</span>
              <span className="text-right w-28">Amount</span>
              <span className="text-right w-24">Price</span>
              <span className="text-right w-16">24h</span>
              <span className="text-right w-24">Value</span>
            </div>

            {myHoldings.map(h => {
              const p = prices[h.symbol]
              const value = p != null ? h.amount * p.price : null

              return (
                <div
                  key={h.id}
                  className="group grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center bg-gray-900 border border-gray-800 rounded-xl px-4 py-4 hover:border-gray-700 transition-colors"
                >
                  {/* Symbol */}
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white">{h.symbol}</span>
                    <button
                      onClick={() => removeHolding(h.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-xs"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Amount */}
                  <span className="text-right text-gray-400 font-mono text-sm w-28">
                    {formatAmount(h.amount)}
                  </span>

                  {/* Price */}
                  <span className="text-right text-gray-300 font-mono text-sm w-24">
                    {loading && !p ? (
                      <span className="text-gray-600">—</span>
                    ) : p ? (
                      formatPrice(p.price)
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </span>

                  {/* 24h change */}
                  <span className={`text-right font-mono text-sm w-16 ${
                    p == null ? 'text-gray-600' :
                    p.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {p ? formatChange(p.change24h) : '—'}
                  </span>

                  {/* Value */}
                  <span className="text-right text-white font-mono text-sm w-24">
                    {value != null ? formatValue(value) : <span className="text-gray-600">—</span>}
                  </span>
                </div>
              )
            })}

            {/* Total row */}
            {myHoldings.length > 1 && (
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 pt-2 mt-1 border-t border-gray-800">
                <span className="text-gray-500 text-sm">Total</span>
                <span className="w-28" />
                <span className="w-24" />
                <span className="w-16" />
                <span className="text-right text-white font-semibold font-mono text-sm w-24">
                  {formatValue(totalValue)}
                </span>
              </div>
            )}
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
