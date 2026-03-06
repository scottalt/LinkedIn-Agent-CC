'use client'

import { useState } from 'react'
import type { Post } from '@/lib/db/types'

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-well text-ink-3',
    approved: 'bg-blue-500/10 text-blue-400',
    scheduled: 'bg-gold/10 text-gold',
    draft_saved: 'bg-purple-500/10 text-purple-400',
    posted: 'bg-emerald-500/10 text-emerald-400',
    failed: 'bg-red-500/10 text-red-400',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-well text-ink-3'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function ScheduleModal({
  post,
  onClose,
  onScheduled,
}: {
  post: Post
  onClose: () => void
  onScheduled: (updated: Post) => void
}) {
  const defaultDt = post.scheduled_at
    ? new Date(post.scheduled_at).toISOString().slice(0, 16)
    : new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  const [dt, setDt] = useState(defaultDt)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_at: new Date(dt).toISOString(), status: 'scheduled' }),
    })
    const data = await res.json()
    if (res.ok) {
      onScheduled(data.post)
      onClose()
    }
    setSaving(false)
  }

  const handleUnschedule = async () => {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_at: null, status: 'approved' }),
    })
    const data = await res.json()
    if (res.ok) {
      onScheduled(data.post)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-layer border border-groove rounded-xl shadow-2xl p-6 w-96 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Schedule Post</h3>
        <p className="text-xs text-ink-2 line-clamp-3">{post.content}</p>
        <div>
          <label className="block text-xs font-medium text-ink-2 mb-1">Date and time</label>
          <input
            type="datetime-local"
            value={dt}
            onChange={(e) => setDt(e.target.value)}
            className="w-full text-sm bg-well border border-groove rounded p-2 text-ink focus:outline-none focus:border-gold"
          />
        </div>
        <p className="text-xs text-ink-3">
          This sets a reminder time only — posting is manual. Copy the post content and paste it on LinkedIn.
        </p>
        <div className="flex justify-between">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-rim hover:border-groove rounded text-ink-2 hover:text-ink transition-colors"
            >
              Cancel
            </button>
            {post.scheduled_at && (
              <button
                onClick={handleUnschedule}
                className="px-3 py-1.5 text-sm text-red-400 border border-red-900 rounded hover:bg-red-500/10 transition-colors"
              >
                Unschedule
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-gold text-[#0c0c0c] text-sm font-medium rounded hover:bg-gold-dim disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SchedulerClient({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [scheduling, setScheduling] = useState<Post | null>(null)

  const updatePost = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const handleMarkPosted = async (id: string) => {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'posted' }),
    })
    const data = await res.json()
    if (res.ok) updatePost(data.post)
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const scheduled = posts
    .filter((p) => p.status === 'scheduled' && p.scheduled_at)
    .sort((a, b) => (a.scheduled_at! > b.scheduled_at! ? 1 : -1))

  const unscheduled = posts.filter(
    (p) => p.status === 'approved' || (p.status === 'scheduled' && !p.scheduled_at)
  )

  const posted = posts.filter((p) => p.status === 'posted').slice(0, 10)

  return (
    <div className="space-y-6">
      {scheduling && (
        <ScheduleModal
          post={scheduling}
          onClose={() => setScheduling(null)}
          onScheduled={updatePost}
        />
      )}

      {/* Scheduled queue */}
      <section>
        <h2 className="text-xs font-medium text-ink-2 uppercase tracking-wider mb-3">
          Scheduled ({scheduled.length})
        </h2>
        {scheduled.length === 0 ? (
          <div className="bg-layer border border-rim rounded-lg p-5 text-sm text-ink-3">
            No scheduled posts.
          </div>
        ) : (
          <div className="space-y-2">
            {scheduled.map((post) => (
              <div key={post.id} className="bg-layer border border-rim rounded-lg p-4 flex items-start gap-4">
                <div className="shrink-0 text-center min-w-[60px]">
                  <p className="text-lg font-semibold text-ink">
                    {post.scheduled_at ? new Date(post.scheduled_at).getDate() : ''}
                  </p>
                  <p className="text-xs text-gold">
                    {post.scheduled_at
                      ? new Date(post.scheduled_at).toLocaleString(undefined, { month: 'short' })
                      : ''}
                  </p>
                  <p className="text-xs text-ink-3">
                    {post.scheduled_at
                      ? new Date(post.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={post.status} />
                    <span className="text-xs text-ink-3 capitalize">{post.mode ?? ''}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(post.content)}
                    className="text-xs text-ink-3 hover:text-ink-2 border border-rim hover:border-groove rounded px-2 py-1 transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setScheduling(post)}
                    className="text-xs text-ink-3 hover:text-ink-2 border border-rim hover:border-groove rounded px-2 py-1 transition-colors"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => handleMarkPosted(post.id)}
                    className="text-xs text-ink-3 hover:text-ink-2 border border-rim hover:border-groove rounded px-2 py-1 transition-colors"
                  >
                    Mark Posted
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ready to schedule */}
      <section>
        <h2 className="text-xs font-medium text-ink-2 uppercase tracking-wider mb-3">
          Ready to Schedule ({unscheduled.length})
        </h2>
        {unscheduled.length === 0 ? (
          <div className="bg-layer border border-rim rounded-lg p-5 text-sm text-ink-3">
            No approved posts waiting.
          </div>
        ) : (
          <div className="space-y-2">
            {unscheduled.map((post) => (
              <div key={post.id} className="bg-layer border border-rim rounded-lg p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={post.status} />
                    <span className="text-xs text-ink-3 capitalize">{post.mode ?? ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(post.content)}
                    className="text-xs text-ink-3 hover:text-ink-2 border border-rim hover:border-groove rounded px-2 py-1 transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setScheduling(post)}
                    className="text-xs text-gold border border-gold/30 hover:bg-gold/10 rounded px-2 py-1 font-medium transition-colors"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recently posted */}
      {posted.length > 0 && (
        <section>
          <h2 className="text-xs font-medium text-ink-2 uppercase tracking-wider mb-3">Recently Posted</h2>
          <div className="space-y-2">
            {posted.map((post) => (
              <div key={post.id} className="bg-layer border border-rim rounded-lg p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink line-clamp-2">{post.content}</p>
                  <p className="text-xs text-ink-3 mt-1">{formatDate(post.posted_at)}</p>
                </div>
                <StatusBadge status={post.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
