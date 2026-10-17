import type { ActivityEvent, AuditKind } from '@/fixtures'

/** Kinds in the order they are listed in filters. */
export const auditKindOrder: AuditKind[] = [
  'run.submitted',
  'run.approved',
  'run.rejected',
  'run.reviewed',
  'run.recalculated',
  'run.held',
  'run.paid',
  'exception.raised',
  'exception.taken',
  'exception.resolved',
]

export const auditKindLabel: Record<AuditKind, string> = {
  'run.submitted': 'Run submitted',
  'run.approved': 'Run approved',
  'run.rejected': 'Run rejected',
  'run.reviewed': 'Run moved to review',
  'run.recalculated': 'Run recalculated',
  'run.held': 'Run put on hold',
  'run.paid': 'Run marked paid',
  'exception.raised': 'Exception raised',
  'exception.taken': 'Exception taken',
  'exception.resolved': 'Exception resolved',
}

/** The audit sentence ends in a grammatical hook for a run label ("…an exception on", "…on hold:"); where there is no label next to it, trim it. */
export const describeEvent = (action: ActivityEvent['action']) => action.replace(/:$/, '').replace(/ on$/, '')
