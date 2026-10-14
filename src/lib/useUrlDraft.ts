import { useState } from 'react'
import { useNavigationType } from 'react-router'

/**
 * The filter state a page is working with, kept as a draft of what the URL is about to say.
 *
 * A router applies a URL change a moment after it starts. A page that builds its next URL from the *current* URL would,
 * if the user acts twice inside that moment, start the second change from a stale base and silently drop the first
 * (and a text box that reads its value from the URL drops keystrokes). So every update composes onto this draft, which
 * always holds the latest intended state, and is then written to the URL.
 *
 * The draft follows the URL only when the URL changes for another reason: Back and Forward (POP) or a link (PUSH).
 * Pages write their own edits with REPLACE, so those are never mistaken for outside changes and can never overwrite
 * what the user has chosen since. Clearing is handled by the caller setting the draft directly.
 *
 * `urlValue` is the state parsed from the current URL and `urlKey` is a string that changes exactly when the URL does
 * (for example `searchParams.toString()`), because `urlValue` is a new object on every render.
 */
export function useUrlDraft<T>(urlValue: T, urlKey: string) {
  const navigationType = useNavigationType()
  const [draft, setDraft] = useState(urlValue)
  const [seenUrlKey, setSeenUrlKey] = useState(urlKey)

  // Adjusting state while rendering (not in an effect) avoids a frame in which the page shows the old filters.
  if (urlKey !== seenUrlKey) {
    setSeenUrlKey(urlKey)
    if (navigationType !== 'REPLACE') setDraft(urlValue)
  }

  return [draft, setDraft] as const
}
