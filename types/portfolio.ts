export interface Portfolio {
  id: string
  name: string
  createdAt: string
}

export interface Holding {
  id: string
  portfolioId: string
  symbol: string
  amount: number
}

export interface AppState {
  portfolios: Portfolio[]
  holdings: Holding[]
}
