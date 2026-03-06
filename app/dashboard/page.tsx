import { getScheduledQueue, getRecentPosted, listPosts } from '@/lib/db/queries/posts'
import { getSetting } from '@/lib/db/queries/settings'
import Link from 'next/link'
import { Post } from '@/lib/db/types'

function MixMeter({ recent }: { recent: Post[] }) {
  const engagement = recent.filter((p) => p.mode === 'engagement').length
  const authority = recent.filter((p) => p.mode === 'authority').length
  const targetE = 3
  const targetA = 2
  const total = engagement + authority
  const engPct = total ? Math.round((engagement / total) * 100) : 0

  const targetRatio = (targetE / (targetE + targetA)) * 100
  const diff = engPct - targetRatio

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-5">
      <h2 className="text-sm font-semibold text-zinc-700 mb-3">Mix Meter (last 30 days)</h2>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-zinc-500 w-20">Engagement</span>
        <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${engPct}%` }}
          />
        </div>
        <span className="text-xs text-zinc-600 w-8 text-right">{engagement}</span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-zinc-500 w-20">Authority</span>
        <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${100 - engPct}%` }}
          />
        </div>
        <span className="text-xs text-zinc-600 w-8 text-right">{authority}</span>
      </div>
      <p className="text-xs text-zinc-400">
        Target: {targetE}:{targetA} ratio.{' '}
        {Math.abs(diff) < 5 ? (
          <span className="text-emerald-600">On track.</span>
        ) : diff > 0 ? (
          <span className="text-amber-600">Post more authority content.</span>
        ) : (
          <span className="text-amber-600">Post more engagement content.</span>
        )}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-zinc-100 text-zinc-600',
    approved: 'bg-blue-50 text-blue-700',
    scheduled: 'bg-amber-50 text-amber-700',
    draft_saved: 'bg-purple-50 text-purple-700',
    posted: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-zinc-100 text-zinc-500'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  if (!score) return null
  const color = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-zinc-400'
  return (
    <span className={`text-xs ${color}`}>
      {label} {score}
    </span>
  )
}

export default function DashboardPage() {
  const scheduled = getScheduledQueue(7)
  const drafts = listPosts({ status: ['draft', 'approved'], limit: 5 })
  const recent = getRecentPosted(30)
  const recentTen = recent.slice(0, 10)

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
        <Link
          href="/composer"
          className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors"
        >
          New Post
        </Link>
      </div>

      <MixMeter recent={recent} />

      {/* Upcoming Queue */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">
          Upcoming (next 7 days) &mdash; {scheduled.length} post{scheduled.length !== 1 ? 's' : ''}
        </h2>
        {scheduled.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg p-5 text-sm text-zinc-400">
            Nothing scheduled.{' '}
            <Link href="/composer" className="text-zinc-600 underline">
              Create a post
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {scheduled.map((post) => (
              <div key={post.id} className="bg-white border border-zinc-200 rounded-lg p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 line-clamp-2">{post.content}</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={post.status} />
                  <Link href={`/composer?edit=${post.id}`} className="text-xs text-zinc-400 hover:text-zinc-700">
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Drafts needing approval */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">
          Drafts &mdash; {drafts.length}
        </h2>
        {drafts.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg p-5 text-sm text-zinc-400">
            No drafts.
          </div>
        ) : (
          <div className="space-y-2">
            {drafts.map((post) => (
              <div key={post.id} className="bg-white border border-zinc-200 rounded-lg p-4 flex items-start justify-between gap-4">
                <p className="text-sm text-zinc-800 line-clamp-2 flex-1">{post.content}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={post.status} />
                  <Link href={`/composer?edit=${post.id}`} className="text-xs text-zinc-400 hover:text-zinc-700">
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent posted */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">Recent Posts</h2>
        {recentTen.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg p-5 text-sm text-zinc-400">
            No posts yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recentTen.map((post) => (
              <div key={post.id} className="bg-white border border-zinc-200 rounded-lg p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 line-clamp-2">{post.content}</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {post.posted_at ? new Date(post.posted_at).toLocaleDateString() : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-right">
                  <ScoreBadge score={post.engagement_score} label="E" />
                  <ScoreBadge score={post.authority_score} label="A" />
                  <Link href={`/analytics?post=${post.id}`} className="text-xs text-zinc-400 hover:text-zinc-700">
                    Stats
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
