import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom has no ResizeObserver, which the chart container needs to measure itself.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom does not implement window.scrollTo, which scroll restoration calls on navigation.
window.scrollTo = () => {}

afterEach(() => {
  cleanup()
})
