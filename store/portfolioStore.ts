import { create } from 'zustand'
import type { Portfolio, Holding, AppState } from '@/types/portfolio'

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Math.random().toString(36).slice(2)}-${Date.now()}`
}

const STORAGE_KEY = 'jeem-folio-state'

function loadFromStorage(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {}
  return { portfolios: [], holdings: [] }
}

function saveToStorage(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      portfolios: state.portfolios,
      holdings: state.holdings,
    }))
  } catch {}
}

interface PortfolioStore extends AppState {
  // portfolios
  addPortfolio: (name: string) => Portfolio
  removePortfolio: (id: string) => void
  renamePortfolio: (id: string, name: string) => void

  // holdings
  addHolding: (portfolioId: string, symbol: string, amount: number) => Holding
  updateHolding: (id: string, patch: Partial<Pick<Holding, 'symbol' | 'amount'>>) => void
  removeHolding: (id: string) => void
}

let initialised = false

export const usePortfolioStore = create<PortfolioStore>()((set, get) => ({
  portfolios: [],
  holdings: [],

  addPortfolio(name) {
    if (!initialised) { set(loadFromStorage()); initialised = true }
    const portfolio: Portfolio = { id: genId(), name: name.trim(), createdAt: new Date().toISOString() }
    set(s => ({ portfolios: [...s.portfolios, portfolio] }))
    saveToStorage(get())
    return portfolio
  },

  removePortfolio(id) {
    set(s => ({
      portfolios: s.portfolios.filter(p => p.id !== id),
      holdings: s.holdings.filter(h => h.portfolioId !== id),
    }))
    saveToStorage(get())
  },

  renamePortfolio(id, name) {
    set(s => ({ portfolios: s.portfolios.map(p => p.id === id ? { ...p, name } : p) }))
    saveToStorage(get())
  },

  addHolding(portfolioId, symbol, amount) {
    const holding: Holding = { id: genId(), portfolioId, symbol: symbol.toUpperCase().trim(), amount }
    set(s => ({ holdings: [...s.holdings, holding] }))
    saveToStorage(get())
    return holding
  },

  updateHolding(id, patch) {
    set(s => ({
      holdings: s.holdings.map(h => h.id === id ? { ...h, ...patch } : h),
    }))
    saveToStorage(get())
  },

  removeHolding(id) {
    set(s => ({ holdings: s.holdings.filter(h => h.id !== id) }))
    saveToStorage(get())
  },
}))

export function useInitStore() {
  const store = usePortfolioStore
  if (!initialised && typeof window !== 'undefined') {
    const saved = loadFromStorage()
    store.setState(saved)
    initialised = true
  }
}
