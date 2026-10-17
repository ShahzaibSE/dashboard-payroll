import { useState } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/**
 * The options every URL-driven page passes to `setSearchParams` when it writes its own draft to the URL. Edits replace the
 * history entry (so typing does not flood history), keep the scroll position, and carry a marker so that `useUrlDraft`
 * can tell the page's own navigations from anyone else's.
 */
export const OWN_URL_WRITE = { replace: true, preventScrollReset: true, state: { urlDraft: true } } as const

function isOwnWrite(navigationType: string, state: unknown) {
  return navigationType === 'REPLACE' && typeof state === 'object' && state !== null && 'urlDraft' in state
}

/**
 * The filter state a page is working with, kept as a draft of what the URL is about to say.
 *
 * A router applies a URL change a moment after it starts. A page that builds its next URL from the *current* URL would,
 * if the user acts twice inside that moment, start the second change from a stale base and silently drop the first
 * (and a text box that reads its value from the URL drops keystrokes). So every update composes onto this draft, which
 * always holds the latest intended state, and is then written to the URL with `OWN_URL_WRITE`.
 *
 * The draft follows the URL whenever a navigation arrives that the page did not write itself: Back and Forward (POP), a
 * link (PUSH), or any other REPLACE. That includes a link to the page's own current URL, which React Router turns into a
 * REPLACE with the same query, so the decision is made on the navigation (`location.key`), not on whether the query text
 * changed. The page's own writes are never mistaken for outside changes and so can never overwrite what the user has
 * chosen since. Clearing is handled by the caller setting the draft directly.
 *
 * `urlValue` is the state parsed from the current URL; it is a new object on every render, so it is only read when a
 * navigation arrives.
 */
export function useUrlDraft<T>(urlValue: T) {
  const { key, state } = useLocation()
  const navigationType = useNavigationType()
  const [draft, setDraft] = useState(urlValue)
  const [seenKey, setSeenKey] = useState(key)

  // Adjusting state while rendering (not in an effect) avoids a frame in which the page shows the old filters.
  if (key !== seenKey) {
    setSeenKey(key)
    if (!isOwnWrite(navigationType, state)) setDraft(urlValue)
  }

  return [draft, setDraft] as const
}
