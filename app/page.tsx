'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePortfolioStore, useInitStore } from '@/store/portfolioStore'
import CreatePortfolioModal from '@/components/CreatePortfolioModal'

export default function Home() {
  useInitStore()
  const { portfolios, holdings, addPortfolio, removePortfolio } = usePortfolioStore()
  const [showCreate, setShowCreate] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="flex items-center justify-between mb-10">
          <h1 className="text-2xl font-bold tracking-tight">Portfolios</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <span className="text-lg leading-none">+</span> New Portfolio
          </button>
        </div>

        {portfolios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-600">
            <p className="text-lg">No portfolios yet</p>
            <p className="text-sm mt-1">Create one to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolios.map(p => {
              const count = holdings.filter(h => h.portfolioId === p.id).length
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
