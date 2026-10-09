import { Badge } from '@/components/ui/badge'
import type { RunStatus } from '@/fixtures'
import { runStatusPresentation } from '@/lib/payroll-status'

export default function RunStatusBadge({ status }: { status: RunStatus }) {
  const { label, tone, icon: Icon } = runStatusPresentation[status]
  return (
    <Badge tone={tone}>
      <Icon className="size-3.5 shrink-0" />
      {label}
    </Badge>
  )
}
