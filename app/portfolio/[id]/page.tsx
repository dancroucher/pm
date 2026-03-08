'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { usePortfolioStore, useInitStore } from '@/store/portfolioStore'
import AddHoldingModal from '@/components/AddHoldingModal'

export default function PortfolioPage() {
  useInitStore()
  const { id } = useParams<{ id: string }>()
  const { portfolios, holdings, addHolding, removeHolding } = usePortfolioStore()
  const [showAdd, setShowAdd] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const portfolio = portfolios.find(p => p.id === id)
  const myHoldings = holdings.filter(h => h.portfolioId === id)

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

        <div className="flex items-center gap-3 mb-10">
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

        {myHoldings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-600">
            <p className="text-lg">No tokens yet</p>
            <p className="text-sm mt-1">Add your first holding</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 px-4 pb-2 text-xs text-gray-600 uppercase tracking-wider">
              <span>Token</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            {myHoldings.map(h => (
              <div
                key={h.id}
                className="group grid grid-cols-3 items-center bg-gray-900 border border-gray-800 rounded-xl px-4 py-4 hover:border-gray-700 transition-colors"
              >
                <span className="font-semibold text-white">{h.symbol}</span>
                <span className="text-right text-gray-300 font-mono">
                  {h.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                </span>
                <div className="flex justify-end">
                  <button
                    onClick={() => removeHolding(h.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 text-sm"
                    title="Remove holding"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
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
