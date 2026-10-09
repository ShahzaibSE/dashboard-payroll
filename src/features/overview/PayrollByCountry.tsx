import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Overview } from '@/features/overview/summary'
import { formatCompactUsd, formatUsd } from '@/lib/format'

type PayrollByCountryProps = { totals: Overview['countryTotals']; regionTotals: Overview['regionTotals']; className?: string }

const ROW_HEIGHT = 30
const regionColor = { APAC: 'var(--chart-apac)', EMEA: 'var(--chart-emea)' } as const

export default function PayrollByCountry({ totals, regionTotals, className }: PayrollByCountryProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Gross payroll by country</CardTitle>
        <span className="text-xs text-muted-foreground">US dollars, this period</span>
      </CardHeader>
      <CardContent>
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs" aria-label="Regions">
          {(['APAC', 'EMEA'] as const).map((region) => (
            <li key={region} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: regionColor[region] }} />
              <span className="font-medium">{region}</span>
              <span className="text-muted-foreground tabular">{formatCompactUsd(regionTotals[region])}</span>
            </li>
          ))}
        </ul>

        {/* The chart is a visual duplicate of the table below, so assistive technology reads the table only. */}
        <div aria-hidden="true" style={{ height: totals.length * ROW_HEIGHT + 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={totals} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} accessibilityLayer={false}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={{ fontSize: 12, fill: 'var(--foreground)' }}
              />
              <Bar dataKey="grossUsd" radius={[0, 3, 3, 0]} barSize={16} isAnimationActive={false}>
                {totals.map((t) => (
                  <Cell key={t.code} fill={regionColor[t.region]} />
                ))}
                <LabelList
                  dataKey="grossUsd"
                  position="right"
                  formatter={(value: unknown) => formatCompactUsd(Number(value))}
                  style={{ fontSize: 12, fill: 'var(--foreground)' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <table className="sr-only">
          <caption>Gross payroll by country, largest first</caption>
          <thead>
            <tr>
              <th scope="col">Country</th>
              <th scope="col">Region</th>
              <th scope="col">Gross payroll (USD)</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((t) => (
              <tr key={t.code}>
                <th scope="row">{t.name}</th>
                <td>{t.region}</td>
                <td>{formatUsd(t.grossUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
