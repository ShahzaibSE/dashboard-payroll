import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type SortableHeaderProps<K extends string> = {
  label: string
  sortKey: K
  activeKey: K
  dir: 'asc' | 'desc'
  onSort: (key: K) => void
  align?: 'right'
}

/** A column header whose button sorts the table. `aria-sort` and the icon both show the current order, so it is never colour alone. */
export default function SortableHeader<K extends string>({ label, sortKey, activeKey, dir, onSort, align }: SortableHeaderProps<K>) {
  const active = activeKey === sortKey
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cn('px-4 py-2 font-medium', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn('inline-flex cursor-pointer items-center gap-1 rounded font-medium hover:text-foreground', active && 'text-foreground')}
      >
        {label}
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      </button>
    </th>
  )
}
