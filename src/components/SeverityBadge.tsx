import { Badge } from '@/components/ui/badge'
import type { ExceptionSeverity } from '@/fixtures'
import { severityPresentation } from '@/lib/payroll-status'

export default function SeverityBadge({ severity }: { severity: ExceptionSeverity }) {
  const { label, tone, icon: Icon } = severityPresentation[severity]
  return (
    <Badge tone={tone}>
      <Icon className="size-3.5 shrink-0" />
      {label}
    </Badge>
  )
}
