import { useEffect, type ReactNode } from 'react'

type PageHeaderProps = { title: string; description?: string; actions?: ReactNode }

/** The page's single h1. Also keeps the browser tab title in sync with the current route. */
export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} · PayrollOps`
  }, [title])

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-tight tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </div>
  )
}
