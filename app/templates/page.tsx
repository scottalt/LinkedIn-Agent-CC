import { listTemplates } from '@/lib/db/queries/templates'
import TemplatesClient from './TemplatesClient'

export default function TemplatesPage() {
  const templates = listTemplates()
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-6">Templates</h1>
      <TemplatesClient initialTemplates={templates} />
    </div>
  )
}
