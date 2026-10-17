import type { Ref } from 'react'
import { cn } from '@/lib/utils'

type OutcomeMessageProps = { message: string; ref?: Ref<HTMLDivElement> }

/**
 * Persistent result of the last workflow action. It is always rendered (visually hidden while empty) so it can take focus
 * before its text appears, and its status role announces the result. It is the focus target because the button that was
 * clicked usually disappears when the data changes.
 */
export default function OutcomeMessage({ message, ref }: OutcomeMessageProps) {
  return (
    <div
      ref={ref}
      role="status"
      tabIndex={-1}
      className={cn('outline-none', message ? 'mb-4 rounded-lg border border-border bg-card p-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring' : 'sr-only')}
    >
      {message}
    </div>
  )
}
