import { listPosts } from '@/lib/db/queries/posts'
import SchedulerClient from './SchedulerClient'

export default function SchedulerPage() {
  const posts = listPosts({
    status: ['approved', 'scheduled', 'draft_saved', 'posted'],
    limit: 100,
  })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-zinc-900 mb-6">Scheduler</h1>
      <SchedulerClient initialPosts={posts} />
    </div>
  )
}
