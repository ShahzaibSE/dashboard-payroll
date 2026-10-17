import { useEffect, useState } from 'react'

const ANNOUNCE_DELAY_MS = 800

type ResultCountProps = {
  /** The visible count, updated on every change. */
  text: string
  /** What assistive technology is told; it differs from `text` on purpose, so the same sentence is not read twice. */
  announcement: string
}

/**
 * The visible "Showing x of y" line of a list page, plus a polite live region that follows it.
 * The live region waits until the count has stopped changing, so typing in the search box produces one announcement
 * when the user pauses instead of one per keystroke.
 */
export default function ResultCount({ text, announcement }: ResultCountProps) {
  const [announced, setAnnounced] = useState(announcement)

  // Synchronizes a screen-reader announcement with a timer, which is outside React.
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(announcement), ANNOUNCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [announcement])

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground tabular">{text}</p>
      <span aria-live="polite" className="sr-only">
        {announced}
      </span>
    </>
  )
}
