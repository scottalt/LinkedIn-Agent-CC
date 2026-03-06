import { listTemplates } from '@/lib/db/queries/templates'
import ComposerClient from './ComposerClient'

export default async function ComposerPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams
  const templates = listTemplates()

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-6">Composer</h1>
      <ComposerClient templates={templates} initialTopic={topic ?? ''} />
    </div>
  )
}
