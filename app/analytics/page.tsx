import { listPosts } from '@/lib/db/queries/posts'
import AnalyticsClient from './AnalyticsClient'

export default function AnalyticsPage() {
  const posts = listPosts({ status: ['approved', 'scheduled', 'draft_saved', 'posted'], limit: 100 })
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-zinc-900 mb-6">Analytics</h1>
      <AnalyticsClient initialPosts={posts} />
    </div>
  )
}
