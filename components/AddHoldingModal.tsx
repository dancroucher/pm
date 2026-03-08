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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(11,14,7,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="panel rounded-sm p-6 w-full max-w-sm mx-4 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs text-gray-600 uppercase tracking-widest">// ADD TOKEN</p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-600 uppercase tracking-widest block mb-1">SYMBOL</label>
            <input
              ref={symbolRef}
              type="text"
              placeholder="BTC / ETH / SOL"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose() }}
              className="w-full bg-gray-800 text-white placeholder-gray-600 px-3 py-2 outline-none border border-dashed border-gray-600 focus:border-gray-400 uppercase tracking-widest"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 uppercase tracking-widest block mb-1">AMOUNT</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              min="0"
              step="any"
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose() }}
              className="w-full bg-gray-800 placeholder-gray-600 px-3 py-2 outline-none border border-dashed border-gray-600 focus:border-gray-400"
              style={{ fontFamily: 'inherit', color: '#e87800' }}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 text-gray-600 hover:text-white text-sm uppercase tracking-widest transition-colors border border-dashed border-gray-700 hover:border-gray-500"
          >
            [ CANCEL ]
          </button>
          <button
            onClick={submit}
            disabled={!symbol.trim() || !amount || parseFloat(amount) <= 0}
            className="px-3 py-1 text-sm uppercase tracking-widest transition-colors border border-dashed border-indigo-600 text-indigo-500 hover:bg-indigo-600 hover:text-gray-950 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            [ ADD ]
          </button>
        </div>
      </div>
    </div>
  )
}
