import { listTemplates } from '@/lib/db/queries/templates'
import ComposerClient from './ComposerClient'

export default function ComposerPage() {
  const templates = listTemplates()

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-zinc-900 mb-6">Composer</h1>
      <ComposerClient templates={templates} />
    </div>
  )
}
