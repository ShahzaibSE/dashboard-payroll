import {
  Banknote,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CirclePause,
  Clock,
  Eye,
  Info,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { BadgeTone } from '@/components/ui/badge'
import type { ExceptionSeverity, ExceptionStatus, RunStatus } from '@/fixtures'

type Presentation = { label: string; tone: BadgeTone; icon: LucideIcon }

/** Lifecycle order, used wherever statuses are listed together. */
export const runStatusOrder: RunStatus[] = ['draft', 'in_review', 'pending_approval', 'approved', 'paid', 'on_hold']

export const runStatusPresentation: Record<RunStatus, Presentation> = {
  draft: { label: 'Draft', tone: 'neutral', icon: CircleDashed },
  in_review: { label: 'In review', tone: 'info', icon: Eye },
  pending_approval: { label: 'Awaiting approval', tone: 'warning', icon: Clock },
  approved: { label: 'Approved', tone: 'success', icon: CircleCheck },
  paid: { label: 'Paid', tone: 'neutral', icon: Banknote },
  on_hold: { label: 'On hold', tone: 'danger', icon: CirclePause },
}

/** Most urgent first, used wherever exceptions are ordered by severity. */
export const severityOrder: ExceptionSeverity[] = ['critical', 'high', 'medium', 'low']

/** Lifecycle order of an exception, used when sorting by status. */
export const exceptionStatusOrder: ExceptionStatus[] = ['open', 'in_progress', 'resolved']

export const exceptionStatusPresentation: Record<ExceptionStatus, Presentation> = {
  open: { label: 'Open', tone: 'warning', icon: CircleDot },
  in_progress: { label: 'In progress', tone: 'info', icon: Clock },
  resolved: { label: 'Resolved', tone: 'success', icon: CircleCheck },
}

export const severityPresentation: Record<ExceptionSeverity, Presentation> = {
  critical: { label: 'Critical', tone: 'danger', icon: TriangleAlert },
  high: { label: 'High', tone: 'warning', icon: TriangleAlert },
  medium: { label: 'Medium', tone: 'info', icon: CircleAlert },
  low: { label: 'Low', tone: 'neutral', icon: Info },
}
