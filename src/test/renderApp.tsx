import { render } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '@/app/routes'

/** Renders the real route tree at `path` using an in-memory history. */
export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return { router, ...render(<RouterProvider router={router} />) }
}

/**
 * Like `renderApp`, but every navigation lands a few milliseconds after it starts, as it does in a real router. jsdom applies
 * navigations immediately and so hides races where a second user action happens before the URL reflects the first.
 */
export function renderAppWithSlowNavigation(path = '/', delayMs = 15) {
  const result = renderApp(path)
  const navigate = result.router.navigate.bind(result.router)
  result.router.navigate = ((...args: Parameters<typeof navigate>) =>
    new Promise((resolve) => setTimeout(() => resolve(navigate(...args)), delayMs))) as typeof navigate
  return result
}
