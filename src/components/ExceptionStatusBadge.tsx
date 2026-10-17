import { Badge } from '@/components/ui/badge'
import type { ExceptionStatus } from '@/fixtures'
import { exceptionStatusPresentation } from '@/lib/payroll-status'

export default function ExceptionStatusBadge({ status }: { status: ExceptionStatus }) {
  const { label, tone, icon: Icon } = exceptionStatusPresentation[status]
  return (
    <Badge tone={tone}>
      <Icon className="size-3.5 shrink-0" />
      {label}
    </Badge>
  )
}
