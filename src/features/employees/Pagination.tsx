import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PaginationProps = { page: number; pageCount: number; onPage: (page: number) => void }

/**
 * Previous and Next. At either end the button is marked aria-disabled instead of being removed or disabled, so the key
 * the user just pressed does not lose focus when they reach the first or last page.
 */
export default function Pagination({ page, pageCount, onPage }: PaginationProps) {
  const atStart = page <= 1
  const atEnd = page >= pageCount
  return (
    <nav aria-label="Pagination" className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground tabular">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" aria-disabled={atStart || undefined} className={atStart ? 'opacity-50' : undefined} onClick={() => !atStart && onPage(page - 1)}>
          <ChevronLeft aria-hidden="true" className="size-4" />
          Previous
        </Button>
        <Button variant="outline" size="sm" aria-disabled={atEnd || undefined} className={atEnd ? 'opacity-50' : undefined} onClick={() => !atEnd && onPage(page + 1)}>
          Next
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
