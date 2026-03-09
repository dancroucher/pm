export interface Portfolio {
  id: string
  name: string
  createdAt: string
  costBasisGbp?: number
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
