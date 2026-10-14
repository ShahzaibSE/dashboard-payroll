import { Button } from '@/components/ui/button'

type ExceptionActionsProps = {
  title: string
  canTake: boolean
  canResolve: boolean
  onTake: () => void
  onResolve: () => void
}

/** Row actions for one exception. Only what the workflow allows right now is offered; button names carry the exception title. */
export default function ExceptionActions({ title, canTake, canResolve, onTake, onResolve }: ExceptionActionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {canTake ? (
        <Button variant="outline" size="sm" aria-label={`Take ownership: ${title}`} onClick={onTake}>
          Take ownership
        </Button>
      ) : null}
      {canResolve ? (
        <Button variant="outline" size="sm" aria-label={`Resolve: ${title}`} onClick={onResolve}>
          Resolve
        </Button>
      ) : null}
      {!canTake && !canResolve ? <span className="text-xs text-muted-foreground">None</span> : null}
    </div>
  )
}
