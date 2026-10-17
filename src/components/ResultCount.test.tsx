import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ResultCount from '@/components/ResultCount'

const region = () => screen.getByText(/shown/)

describe('ResultCount', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the count at once and announces the initial count without waiting', () => {
    render(<ResultCount text="Showing 24 of 24 runs" announcement="24 runs shown" />)
    expect(screen.getByText('Showing 24 of 24 runs')).toBeInTheDocument()
    expect(region()).toHaveAttribute('aria-live', 'polite')
    expect(region()).toHaveTextContent('24 runs shown')
  })

  it('updates the visible count immediately but announces only once the count stops changing', () => {
    const { rerender } = render(<ResultCount text="Showing 24 of 24 runs" announcement="24 runs shown" />)

    rerender(<ResultCount text="Showing 9 of 24 runs" announcement="9 runs shown" />)
    act(() => void vi.advanceTimersByTime(300))
    rerender(<ResultCount text="Showing 2 of 24 runs" announcement="2 runs shown" />)
    act(() => void vi.advanceTimersByTime(500))

    expect(screen.getByText('Showing 2 of 24 runs')).toBeInTheDocument()
    expect(region()).toHaveTextContent('24 runs shown')

    act(() => void vi.advanceTimersByTime(400))
    expect(region()).toHaveTextContent('2 runs shown')
    expect(region()).not.toHaveTextContent('9 runs')
  })
})
