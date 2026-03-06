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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-96 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-800">Schedule Post</h3>
        <p className="text-xs text-zinc-500 line-clamp-3">{post.content}</p>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Date and time</label>
          <input
            type="datetime-local"
            value={dt}
            onChange={(e) => setDt(e.target.value)}
            className="w-full text-sm border border-zinc-300 rounded p-2 text-zinc-900"
          />
        </div>
        <p className="text-xs text-zinc-400">
          This sets a reminder time only — posting is manual. Copy the post content and paste it on LinkedIn.
        </p>
        <div className="flex justify-between">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-zinc-200 rounded hover:bg-zinc-50"
            >
              Cancel
            </button>
            {post.scheduled_at && (
              <button
                onClick={handleUnschedule}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
              >
                Unschedule
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-zinc-900 text-white text-sm rounded hover:bg-zinc-700 disabled:opacity-50"
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
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">
          Scheduled ({scheduled.length})
        </h2>
        {scheduled.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg p-5 text-sm text-zinc-400">
            No scheduled posts.
          </div>
        ) : (
          <div className="space-y-2">
            {scheduled.map((post) => (
              <div key={post.id} className="bg-white border border-zinc-200 rounded-lg p-4 flex items-start gap-4">
                <div className="shrink-0 text-center min-w-[60px]">
                  <p className="text-lg font-semibold text-zinc-800">
                    {post.scheduled_at ? new Date(post.scheduled_at).getDate() : ''}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {post.scheduled_at
                      ? new Date(post.scheduled_at).toLocaleString(undefined, { month: 'short' })
                      : ''}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {post.scheduled_at
                      ? new Date(post.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={post.status} />
                    <span className="text-xs text-zinc-400 capitalize">{post.mode ?? ''}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(post.content)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-1"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setScheduling(post)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-1"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => handleMarkPosted(post.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-1"
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
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">
          Ready to Schedule ({unscheduled.length})
        </h2>
        {unscheduled.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg p-5 text-sm text-zinc-400">
            No approved posts waiting.
          </div>
        ) : (
          <div className="space-y-2">
            {unscheduled.map((post) => (
              <div key={post.id} className="bg-white border border-zinc-200 rounded-lg p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={post.status} />
                    <span className="text-xs text-zinc-400 capitalize">{post.mode ?? ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(post.content)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-1"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => setScheduling(post)}
                    className="text-xs text-zinc-900 hover:bg-zinc-100 border border-zinc-300 rounded px-2 py-1 font-medium"
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
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Recently Posted</h2>
          <div className="space-y-2">
            {posted.map((post) => (
              <div key={post.id} className="bg-white border border-zinc-200 rounded-lg p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 line-clamp-2">{post.content}</p>
                  <p className="text-xs text-zinc-400 mt-1">{formatDate(post.posted_at)}</p>
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
