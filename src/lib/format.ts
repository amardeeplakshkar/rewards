export function money(paise: number): string {
  const sign = paise < 0 ? '−' : ''
  const abs = Math.abs(paise)
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  return `${sign}₹${whole.toLocaleString('en-IN')}.${frac}`
}

export function moneyCompact(paise: number): string {
  const abs = Math.abs(paise)
  return abs % 100 === 0 ? `₹${Math.floor(abs / 100).toLocaleString('en-IN')}` : money(paise)
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
