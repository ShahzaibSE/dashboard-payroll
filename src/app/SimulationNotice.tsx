import { FlaskConical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { REFERENCE_DATE } from '@/fixtures/reference'
import { formatDate } from '@/lib/format'

/** Persistent disclosure: everything here is synthetic and every action is local. */
export default function SimulationNotice() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Badge tone="warning" className="whitespace-normal">
        <FlaskConical className="size-3.5 shrink-0" />
        <span>Simulated – changes are local and not saved</span>
      </Badge>
      <p className="text-xs text-muted-foreground tabular">Synthetic data as of {formatDate(REFERENCE_DATE)}</p>
    </div>
  )
}
