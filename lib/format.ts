export type Currency = 'usd' | 'gbp'

export function formatPrice(price: number, currency: Currency = 'usd'): string {
  const curr = currency.toUpperCase()
  if (price >= 0.01) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: price >= 1 ? 2 : 4,
    }).format(price)
  }
  const sym = currency === 'gbp' ? '£' : '$'
  return sym + price.toPrecision(4)
}

export function formatValue(value: number, currency: Currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 8 })
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}
