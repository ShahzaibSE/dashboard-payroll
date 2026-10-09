import PageHeader from '@/components/PageHeader'

type PlaceholderPageProps = { title: string; description?: string }

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <p className="max-w-prose rounded-lg border border-dashed border-input bg-card p-4 text-sm text-muted-foreground">
        This module is planned and has not been built yet.
      </p>
    </>
  )
}
