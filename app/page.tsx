'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePortfolioStore, useInitStore } from '@/store/portfolioStore'
import CreatePortfolioModal from '@/components/CreatePortfolioModal'
import { formatValue } from '@/lib/format'

interface PriceData { price: number; change24h: number }

function useAllPrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({})

  const fetchPrices = useCallback(async () => {
    if (symbols.length === 0) return
    try {
      const res = await fetch(`/api/prices?symbols=${symbols.join(',')}`)
      if (res.ok) setPrices(await res.json())
    } catch {}
  }, [symbols.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPrices()
    const id = setInterval(fetchPrices, 60_000)
    return () => clearInterval(id)
  }, [fetchPrices])

  return prices
}

export default function Home() {
  useInitStore()
  const { portfolios, holdings, addPortfolio, removePortfolio } = usePortfolioStore()
  const [showCreate, setShowCreate] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const allSymbols = mounted
    ? [...new Set(holdings.map(h => h.symbol))]
    : []
  const prices = useAllPrices(allSymbols)

  if (!mounted) return null

  const portfolioValue = (portfolioId: string) =>
    holdings
      .filter(h => h.portfolioId === portfolioId)
      .reduce((sum, h) => sum + (prices[h.symbol]?.price != null ? h.amount * prices[h.symbol].price : 0), 0)

  const grandTotal = portfolios.reduce((sum, p) => sum + portfolioValue(p.id), 0)

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Portfolios</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <span className="text-lg leading-none">+</span> New Portfolio
          </button>
        </div>

        {portfolios.length > 0 && (
          <p className="text-3xl font-bold text-white mb-10">{formatValue(grandTotal)}</p>
        )}

        {portfolios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-600">
            <p className="text-lg">No portfolios yet</p>
            <p className="text-sm mt-1">Create one to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolios.map(p => {
              const count = holdings.filter(h => h.portfolioId === p.id).length
              const value = portfolioValue(p.id)
              return (
                <div key={p.id} className="group relative bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
                  <Link href={`/portfolio/${p.id}`} className="absolute inset-0 rounded-2xl" />
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-semibold text-white">{p.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {count === 0 ? 'No tokens' : `${count} token${count !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.preventDefault(); removePortfolio(p.id) }}
                      className="relative z-10 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1"
                      title="Delete portfolio"
                    >
                      ✕
                    </button>
                  </div>
                  {value > 0 && (
                    <p className="text-white font-semibold mt-4">{formatValue(value)}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePortfolioModal
          onClose={() => setShowCreate(false)}
          onCreate={name => addPortfolio(name)}
        />
      )}
    </main>
  )
}
