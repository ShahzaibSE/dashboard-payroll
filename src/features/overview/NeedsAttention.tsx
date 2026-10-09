import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import SeverityBadge from '@/components/SeverityBadge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import type { AttentionItem, Overview } from '@/features/overview/summary'

type Group = { heading: string; items: AttentionItem[]; viewAll: { to: string; label: string } }

function AttentionGroup({ heading, items, viewAll }: Group) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 border-t border-border bg-muted/60 px-4 py-1.5">
        <h3 className="text-xs font-semibold">
          {heading} <span className="font-normal text-muted-foreground tabular">({items.length})</span>
        </h3>
        <Link to={viewAll.to} className="text-xs font-medium text-primary underline-offset-2 hover:underline">
          {viewAll.label}
        </Link>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="border-t border-border first:border-t-0">
            <Link to={item.href} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium sm:truncate">{item.title}</span>
                <span className="block break-words text-xs text-muted-foreground tabular sm:truncate">{item.detail}</span>
              </span>
              {item.severity ? <SeverityBadge severity={item.severity} /> : null}
              <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function NeedsAttention({ attention, className }: { attention: Overview['attention']; className?: string }) {
  const total = attention.awaitingApproval.length + attention.criticalExceptions.length + attention.onHold.length
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle>Needs attention</CardTitle>
        <span className="text-xs text-muted-foreground tabular">
          {total} {total === 1 ? 'item' : 'items'}
        </span>
      </CardHeader>
      {total === 0 ? (
        <p className="border-t border-border px-4 py-6 text-sm text-muted-foreground">Nothing needs attention right now.</p>
      ) : (
        <>
          <AttentionGroup heading="Awaiting approval" items={attention.awaitingApproval} viewAll={{ to: '/approvals', label: 'View approvals' }} />
          <AttentionGroup heading="Critical exceptions" items={attention.criticalExceptions} viewAll={{ to: '/exceptions', label: 'View exceptions' }} />
          <AttentionGroup heading="Runs on hold" items={attention.onHold} viewAll={{ to: '/payroll-runs', label: 'View runs' }} />
        </>
      )}
    </Card>
  )
}
