'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onClose: () => void
  onCreate: (name: string, holdings?: { symbol: string; amount: number }[]) => void
}

type Tab = 'manual' | 'wallet'

export interface WalletHolding {
  symbol: string
  name: string
  amount: number
  mint: string
}

const SOL_DECIMALS = 9
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
interface JupToken { symbol: string; name: string }
let jupCache: Record<string, JupToken> | null = null

async function getJupiterTokens(): Promise<Record<string, JupToken>> {
  if (jupCache) return jupCache
  const res = await fetch('https://token.jup.ag/strict')
  const list: { address: string; symbol: string; name: string }[] = await res.json()
  jupCache = Object.fromEntries(list.map(t => [t.address, { symbol: t.symbol.toUpperCase(), name: t.name }]))
  return jupCache
}

const RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
]

async function solanaRpc(method: string, params: unknown[]) {
  let lastErr = ''
  for (const rpc of RPCS) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      })
      const text = await res.text()
      if (!text) { lastErr = `${rpc} returned empty response (${res.status})`; continue }
      const json = JSON.parse(text)
      if (json.error) { lastErr = json.error.message; continue }
      return json.result
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e)
    }
  }
  throw new Error(lastErr || 'RPC unavailable')
}

async function fetchWalletHoldings(address: string): Promise<WalletHolding[]> {
  const [balanceResult, ta1, ta2, tokenMap] = await Promise.all([
    solanaRpc('getBalance', [address]),
    solanaRpc('getTokenAccountsByOwner', [address, { programId: TOKEN_PROGRAM }, { encoding: 'jsonParsed' }]),
    solanaRpc('getTokenAccountsByOwner', [address, { programId: TOKEN_2022_PROGRAM }, { encoding: 'jsonParsed' }]),
    getJupiterTokens(),
  ])

  const holdings: WalletHolding[] = []

  const solAmount = (balanceResult?.value ?? 0) / Math.pow(10, SOL_DECIMALS)
  if (solAmount > 0.0001) {
    holdings.push({ symbol: 'SOL', name: 'Solana', amount: solAmount, mint: 'native' })
  }

  for (const account of [...(ta1?.value ?? []), ...(ta2?.value ?? [])]) {
    const info = account?.account?.data?.parsed?.info
    if (!info?.mint) continue
    const amount = parseFloat(info.tokenAmount?.uiAmountString ?? '0')
    if (!amount || amount <= 0) continue
    const token = tokenMap[info.mint]
    if (!token) continue
    holdings.push({ symbol: token.symbol, name: token.name, amount, mint: info.mint })
  }

  holdings.sort((a, b) => {
    if (a.mint === 'native') return -1
    if (b.mint === 'native') return 1
    return b.amount - a.amount
  })

  return holdings
}

export default function CreatePortfolioModal({ onClose, onCreate }: Props) {
  const [tab, setTab] = useState<Tab>('manual')

  // manual
  const [name, setName] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (tab === 'manual') nameRef.current?.focus() }, [tab])

  // wallet
  const [walletName, setWalletName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [holdings, setHoldings] = useState<WalletHolding[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const addrRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (tab === 'wallet') addrRef.current?.focus() }, [tab])

  const submitManual = () => {
    if (!name.trim()) return
    onCreate(name.trim())
    onClose()
  }

  const doFetch = async () => {
    const addr = address.trim()
    if (!addr) return
    setLoading(true)
    setError('')
    setHoldings(null)
    try {
      const list = await fetchWalletHoldings(addr)
      if (list.length === 0) { setError('No recognised tokens found in this wallet'); return }
      setHoldings(list)
      setSelected(new Set(list.map(h => h.mint)))
      if (!walletName) setWalletName('Phantom Wallet')
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Failed to fetch wallet')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelected = (mint: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(mint) ? next.delete(mint) : next.add(mint)
      return next
    })
  }

  const submitWallet = () => {
    if (!walletName.trim() || !holdings) return
    const chosenHoldings = holdings
      .filter(h => selected.has(h.mint))
      .map(h => ({ symbol: h.symbol, amount: h.amount }))
    onCreate(walletName.trim(), chosenHoldings)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm mx-4 flex flex-col gap-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
          {(['manual', 'wallet'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                tab === t ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'manual' ? 'Manual' : 'Phantom Wallet'}
            </button>
          ))}
        </div>

        {tab === 'manual' ? (
          <>
            <h2 className="text-white font-semibold text-lg -mb-1">New Portfolio</h2>
            <input
              ref={nameRef}
              type="text"
              placeholder="Portfolio name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitManual(); if (e.key === 'Escape') onClose() }}
              className="bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors rounded-xl hover:bg-gray-800">
                Cancel
              </button>
              <button
                onClick={submitManual}
                disabled={!name.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Create
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-white font-semibold text-lg -mb-1">Import from Wallet</h2>
            <div className="flex gap-2">
              <input
                ref={addrRef}
                type="text"
                placeholder="Solana wallet address"
                value={address}
                onChange={e => { setAddress(e.target.value); setHoldings(null); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter') doFetch(); if (e.key === 'Escape') onClose() }}
                className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-w-0"
              />
              <button
                onClick={doFetch}
                disabled={!address.trim() || loading}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
              >
                {loading ? '…' : 'Fetch'}
              </button>
            </div>

            {error && <p className="text-red-400 text-sm -mt-2">{error}</p>}

            {holdings && (
              <>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto -mx-1 px-1">
                  {holdings.map(h => (
                    <label key={h.mint} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(h.mint)}
                        onChange={() => toggleSelected(h.mint)}
                        className="accent-indigo-500 w-4 h-4 flex-shrink-0"
                      />
                      <span className="text-white text-sm font-medium">{h.symbol}</span>
                      <span className="text-gray-500 text-xs flex-1">{h.name}</span>
                      <span className="text-gray-400 text-xs tabular-nums">
                        {h.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </span>
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Portfolio name"
                  value={walletName}
                  onChange={e => setWalletName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitWallet(); if (e.key === 'Escape') onClose() }}
                  className="bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors rounded-xl hover:bg-gray-800">
                Cancel
              </button>
              {holdings && (
                <button
                  onClick={submitWallet}
                  disabled={!walletName.trim() || selected.size === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Create ({selected.size})
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
