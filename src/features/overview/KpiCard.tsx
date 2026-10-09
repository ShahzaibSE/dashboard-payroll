import { Link } from 'react-router'
import { Card } from '@/components/ui/card'

type KpiCardProps = { label: string; value: string; detail: string; href: string }

export default function KpiCard({ label, value, detail, href }: KpiCardProps) {
  return (
    <Card className="transition-colors hover:border-input">
      <Link to={href} className="block rounded-lg p-4">
        <span className="block text-xs font-medium text-muted-foreground">{label}</span>{' '}
        <span className="mt-1 block text-2xl font-semibold leading-none tabular">{value}</span>{' '}
        <span className="mt-2 block text-xs text-muted-foreground tabular">{detail}</span>
      </Link>
    </Card>
  )
}
