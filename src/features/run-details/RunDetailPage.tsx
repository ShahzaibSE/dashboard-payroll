import { useParams } from 'react-router'
import RunDetailView from '@/features/run-details/RunDetailView'

/** Route entry. Keying by run gives each run its own outcome message, confirmation, and reject draft. */
export default function RunDetailPage() {
  const { runId = '' } = useParams()
  return <RunDetailView key={runId} runId={runId} />
}
