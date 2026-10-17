import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import RunStatusBadge from '@/components/RunStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RunDetail } from '@/features/run-details/runDetail'
import { runStatusPresentation } from '@/lib/payroll-status'
import { parseRejectReason, REJECT_REASON_MAX, REJECT_REASON_MIN } from '@/state/payroll/rejectReason'
import type { PayrollAction } from '@/state/payroll/types'

type RunActionsProps = {
  run: RunDetail
  /**
   * Identifies the workflow state the screen is showing (the audit log array, which every action replaces).
   * A confirmation opened against one state is closed once the state is replaced, even if the run looks the same again.
   */
  contextKey: object
  onPerform: (action: PayrollAction, message: string) => void
}

type PanelKind = 'approve' | 'reject'
type Panel = { kind: PanelKind; contextKey: object } | null

const textareaClass = 'w-full rounded-md border border-input bg-card px-2.5 py-2 text-sm'

/** Run-level decisions. Approve and Reject ask for confirmation in an inline region (not a modal) that takes focus and closes on Escape. */
export default function RunActions({ run, contextKey, onPerform }: RunActionsProps) {
  const [panel, setPanel] = useState<Panel>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const approveButton = useRef<HTMLButtonElement>(null)
  const rejectButton = useRef<HTMLButtonElement>(null)
  // A stable callback ref, so focus moves in once when the region appears and never again on later renders.
  const focusOnMount = useCallback((element: HTMLElement | null) => element?.focus(), [])

  const { submit, approve, reject } = run.decisions
  // A confirmation belongs to the workflow state it was opened in. If that state has been replaced (another action, a reset),
  // or the decision is no longer allowed, it is discarded together with its draft, so it can never reappear later.
  const stale = panel !== null && (panel.contextKey !== contextKey || !(panel.kind === 'approve' ? approve.allowed : reject.allowed))
  if (stale) {
    setPanel(null)
    setReason('')
    setError('')
  }
  const openPanel: PanelKind | null = stale || panel === null ? null : panel.kind

  function open(kind: PanelKind) {
    if (panel?.kind !== kind) {
      setReason('')
      setError('')
    }
    setPanel({ kind, contextKey })
  }

  function close(returnFocusTo: PanelKind | null) {
    setPanel(null)
    setReason('')
    setError('')
    if (returnFocusTo === 'approve') approveButton.current?.focus()
    if (returnFocusTo === 'reject') rejectButton.current?.focus()
  }

  function onEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close(openPanel)
    }
  }

  function confirmApprove() {
    close(null)
    onPerform({ type: 'run/approve', runId: run.id }, 'Run approved (simulated). No payment was made and nothing was saved.')
  }

  function confirmReject() {
    const parsed = parseRejectReason(reason)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    close(null)
    onPerform(
      { type: 'run/reject', runId: run.id, reason: parsed.value },
      'Run rejected and returned to review (simulated). The reason is recorded in the run activity.',
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Review and approval</CardTitle>
        <RunStatusBadge status={run.status} />
      </CardHeader>
      <CardContent className="pt-0">
        <p className="mb-3 text-xs text-muted-foreground">Simulated workflow: decisions change this demo only. No payment is made and nothing is saved.</p>

        {submit.allowed ? (
          <Button onClick={() => onPerform({ type: 'run/submit', runId: run.id }, 'Run submitted for approval (simulated). It now awaits an approver.')}>
            Submit for approval
          </Button>
        ) : reject.allowed ? (
          <div className="flex flex-wrap items-start gap-2">
            <Button
              ref={approveButton}
              aria-disabled={approve.allowed ? undefined : true}
              aria-describedby={approve.allowed ? undefined : 'approve-blocked'}
              className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-primary"
              onClick={() => approve.allowed && open('approve')}
            >
              Approve run
            </Button>
            <Button ref={rejectButton} variant="outline" onClick={() => open('reject')}>
              Reject run
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No actions are available for a run that is {runStatusPresentation[run.status].label.toLowerCase()}.
          </p>
        )}

        {!approve.allowed && reject.allowed ? (
          <p id="approve-blocked" className="mt-2 text-sm text-danger">
            Cannot approve yet: {approve.message}
          </p>
        ) : null}

        {openPanel === 'approve' ? (
          <div role="group" aria-labelledby="confirm-approve-title" onKeyDown={onEscape} className="mt-3 rounded-md border border-border bg-muted/40 p-3">
            <h3 id="confirm-approve-title" ref={focusOnMount} tabIndex={-1} className="text-sm font-semibold outline-none">
              Approve this run?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">Simulated: the run will show as Approved in this demo only. No payment is made.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={confirmApprove}>Confirm approval</Button>
              <Button variant="outline" onClick={() => close('approve')}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {openPanel === 'reject' ? (
          <div role="group" aria-labelledby="confirm-reject-title" onKeyDown={onEscape} className="mt-3 rounded-md border border-border bg-muted/40 p-3">
            <h3 id="confirm-reject-title" className="text-sm font-semibold">
              Reject this run?
            </h3>
            <label htmlFor="reject-reason" className="mt-2 block text-xs font-medium text-muted-foreground">
              Reason for rejection
            </label>
            <textarea
              id="reject-reason"
              ref={focusOnMount}
              rows={3}
              className={textareaClass}
              value={reason}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'reject-reason-hint reject-reason-error' : 'reject-reason-hint'}
              onChange={(event) => {
                setReason(event.target.value)
                if (error) setError('')
              }}
            />
            <p id="reject-reason-hint" className="mt-1 text-xs text-muted-foreground">
              {REJECT_REASON_MIN} to {REJECT_REASON_MAX} characters. The reason is recorded in the run activity. The run returns to review.
            </p>
            {error ? (
              <p id="reject-reason-error" role="alert" className="mt-1 text-sm text-danger">
                {error}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={confirmReject}>Confirm rejection</Button>
              <Button variant="outline" onClick={() => close('reject')}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
