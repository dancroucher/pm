'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onClose: () => void
  onCreate: (name: string) => void
}

export default function CreatePortfolioModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = () => {
    if (!name.trim()) return
    onCreate(name.trim())
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
        <p className="text-xs text-gray-600 uppercase tracking-widest">// NEW PORTFOLIO</p>

        <input
          ref={inputRef}
          type="text"
          placeholder="PORTFOLIO NAME"
          value={name}
          onChange={e => setName(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose() }}
          className="bg-gray-800 text-white placeholder-gray-600 px-3 py-2 outline-none border border-dashed border-gray-600 focus:border-gray-400 uppercase tracking-widest w-full"
          style={{ fontFamily: 'inherit' }}
        />

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 text-gray-600 hover:text-white text-sm uppercase tracking-widest transition-colors border border-dashed border-gray-700 hover:border-gray-500"
          >
            [ CANCEL ]
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="px-3 py-1 text-sm uppercase tracking-widest transition-colors border border-dashed border-indigo-600 text-indigo-500 hover:bg-indigo-600 hover:text-gray-950 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            [ CREATE ]
          </button>
        </div>
      </div>
    </div>
  )
}
