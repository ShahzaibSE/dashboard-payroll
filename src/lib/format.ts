const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const shortDateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const integerFormat = new Intl.NumberFormat('en-US')
const compactUsdFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const DAY_MS = 86_400_000

function utc(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`)
}

export const formatDate = (isoDate: string) => dateFormat.format(utc(isoDate))
export const formatShortDate = (isoDate: string) => shortDateFormat.format(utc(isoDate))
export const formatInteger = (value: number) => integerFormat.format(value)
export const formatUsd = (value: number) => usdFormat.format(value)
export const formatCompactUsd = (value: number) => compactUsdFormat.format(value)

/** Whole days from `from` to `to` (negative when `to` is earlier). Both are ISO dates (YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / DAY_MS)
}

/** "Today, 09:41 UTC" or "11 Oct, 17:48 UTC" for an event timestamp such as 2026-10-11T17:48. */
export function formatEventTime(today: string, occurredAt: string): string {
  const [date, time] = occurredAt.split('T')
  return `${daysBetween(today, date) === 0 ? 'Today' : formatShortDate(date)}, ${time} UTC`
}

export function relativeDays(from: string, to: string): string {
  const days = daysBetween(from, to)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return days > 0 ? `in ${days} days` : `${-days} days ago`
}
