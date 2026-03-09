import { create } from 'zustand'
import type { Portfolio, Holding, AppState } from '@/types/portfolio'

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Math.random().toString(36).slice(2)}-${Date.now()}`
}

const STORAGE_KEY = 'jeem-folio-state'
const EMPTY: AppState = { portfolios: [], holdings: [] }

// --- Local persistence ---

function loadLocal(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {}
  return EMPTY
}

function saveLocal(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      portfolios: state.portfolios,
      holdings: state.holdings,
    }))
  } catch {}
}

// --- Remote persistence with debounce + retry ---

let saveTimer: ReturnType<typeof setTimeout> | null = null
let saveInFlight = false
let pendingState: AppState | null = null

function saveRemote(state: AppState) {
  pendingState = state

  // Debounce: wait 500ms after last mutation before sending
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => flushRemote(), 500)
}

async function flushRemote(retries = 2) {
  if (saveInFlight || !pendingState) return
  saveInFlight = true
  const state = pendingState
  pendingState = null

  try {
    const r = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolios: state.portfolios, holdings: state.holdings }),
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
  } catch (e) {
    console.error('saveRemote failed:', e)
    if (retries > 0) {
      // Retry after 2s backoff
      pendingState = state
      setTimeout(() => {
        saveInFlight = false
        flushRemote(retries - 1)
      }, 2000)
      return
    }
    console.error('saveRemote gave up after retries')
  }

  saveInFlight = false

  // If another save was queued while we were in flight, flush it
  if (pendingState) {
    setTimeout(() => flushRemote(), 100)
  }
}

// --- Combined save ---

function save(state: AppState) {
  saveLocal(state)
  saveRemote(state)
}

// --- Dirty tracking: prevents blob from overwriting user edits during init ---

let userDirty = false

function markDirty() {
  userDirty = true
}

// --- Store ---

interface PortfolioStore extends AppState {
  addPortfolio: (name: string) => Portfolio
  removePortfolio: (id: string) => void
  renamePortfolio: (id: string, name: string) => void
  updatePortfolio: (id: string, patch: Partial<Pick<Portfolio, 'name' | 'costBasisGbp'>>) => void
  addHolding: (portfolioId: string, symbol: string, amount: number) => Holding
  updateHolding: (id: string, patch: Partial<Pick<Holding, 'symbol' | 'amount'>>) => void
  removeHolding: (id: string) => void
}

let initialised = false

export const usePortfolioStore = create<PortfolioStore>()((set, get) => ({
  portfolios: [],
  holdings: [],

  addPortfolio(name) {
    const portfolio: Portfolio = { id: genId(), name: name.trim(), createdAt: new Date().toISOString() }
    set(s => ({ portfolios: [...s.portfolios, portfolio] }))
    markDirty()
    save(get())
    return portfolio
  },

  removePortfolio(id) {
    set(s => ({
      portfolios: s.portfolios.filter(p => p.id !== id),
      holdings: s.holdings.filter(h => h.portfolioId !== id),
    }))
    markDirty()
    save(get())
  },

  renamePortfolio(id, name) {
    set(s => ({ portfolios: s.portfolios.map(p => p.id === id ? { ...p, name } : p) }))
    markDirty()
    save(get())
  },

  updatePortfolio(id, patch) {
    set(s => ({ portfolios: s.portfolios.map(p => p.id === id ? { ...p, ...patch } : p) }))
    markDirty()
    save(get())
  },

  addHolding(portfolioId, symbol, amount) {
    const holding: Holding = { id: genId(), portfolioId, symbol: symbol.toUpperCase().trim(), amount }
    set(s => ({ holdings: [...s.holdings, holding] }))
    markDirty()
    save(get())
    return holding
  },

  updateHolding(id, patch) {
    set(s => ({
      holdings: s.holdings.map(h => h.id === id ? { ...h, ...patch } : h),
    }))
    markDirty()
    save(get())
  },

  removeHolding(id) {
    set(s => ({ holdings: s.holdings.filter(h => h.id !== id) }))
    markDirty()
    save(get())
  },
}))

export function useInitStore() {
  if (!initialised && typeof window !== 'undefined') {
    initialised = true
    userDirty = false

    // Load from localStorage immediately for fast render
    const local = loadLocal()
    usePortfolioStore.setState(local)

    // Then fetch from blob and reconcile
    fetch('/api/data')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((remote: AppState) => {
        // If user already made changes, don't overwrite — push local to blob instead
        if (userDirty) {
          saveRemote(usePortfolioStore.getState())
          return
        }

        if (remote?.portfolios?.length) {
          // Blob has data and user hasn't touched anything — use blob as authoritative
          usePortfolioStore.setState(remote)
          saveLocal(remote)
        } else if (local.portfolios.length) {
          // Blob is empty but local has data — migrate local up to blob
          saveRemote(local)
        }
      })
      .catch(e => {
        console.error('Init fetch from blob failed:', e)
        // Local data is already loaded, so app still works
      })
  }
}
