'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onClose: () => void
  onAdd: (symbol: string, amount: number) => void
}

export default function AddHoldingModal({ onClose, onAdd }: Props) {
  const [symbol, setSymbol] = useState('')
  const [amount, setAmount] = useState('')
  const symbolRef = useRef<HTMLInputElement>(null)

  useEffect(() => { symbolRef.current?.focus() }, [])

  const submit = () => {
    const parsed = parseFloat(amount)
    if (!symbol.trim() || isNaN(parsed) || parsed <= 0) return
    onAdd(symbol.trim(), parsed)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-white font-semibold text-lg">Add Token</h2>

        <div className="flex flex-col gap-3">
          <input
            ref={symbolRef}
            type="text"
            placeholder="Symbol (e.g. BTC, ETH)"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose() }}
            className="bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            min="0"
            step="any"
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose() }}
            className="bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!symbol.trim() || !amount || parseFloat(amount) <= 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
