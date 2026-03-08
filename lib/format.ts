export function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
  if (price >= 1) return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
  if (price >= 0.01) return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 })
  // Very small prices — show 4 significant figures
  return '$' + price.toPrecision(4)
}

export function formatValue(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 8 })
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}
