'use client'

import { useState } from 'react'
import type { Post } from '@/lib/db/types'

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 w-8 text-right">{score}</span>
    </div>
  )
}

interface MetricsFormProps {
  post: Post
  onSaved: (updated: Post) => void
}

function MetricsForm({ post, onSaved }: MetricsFormProps) {
  const [metrics, setMetrics] = useState({
    impressions: post.impressions,
    likes: post.likes,
    comments: post.comments,
    reposts: post.reposts,
    saves: post.saves,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, ...metrics, source: 'manual' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Refresh post data
      const postRes = await fetch(`/api/posts/${post.id}`)
      const postData = await postRes.json()
      onSaved(postData.post)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-zinc-100 space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {(['impressions', 'likes', 'comments', 'reposts', 'saves'] as const).map((key) => (
          <div key={key}>
            <label className="block text-[10px] text-zinc-400 mb-1 capitalize">{key}</label>
            <input
              type="number"
              min={0}
              value={metrics[key]}
              onChange={(e) => setMetrics((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              className="w-full text-xs border border-zinc-200 rounded p-1.5 text-center"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 bg-zinc-800 text-white text-xs rounded hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Stats'}
        </button>
      </div>
    </div>
  )
}

export default function AnalyticsClient({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleSaved = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const handleMarkPosted = async (id: string) => {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'posted' }),
    })
    const data = await res.json()
    if (res.ok) {
      setPosts((prev) => prev.map((p) => (p.id === id ? data.post : p)))
    }
  }

  const allPosts = posts.filter((p) => ['approved', 'scheduled', 'draft_saved', 'posted'].includes(p.status))

  return (
    <div className="space-y-2">
      {allPosts.length === 0 && (
        <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center text-sm text-zinc-400">
          No posts yet. Create some in the Composer.
        </div>
      )}
      {allPosts.map((post) => (
        <div key={post.id} className="bg-white border border-zinc-200 rounded-lg p-5">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-800 line-clamp-2 mb-2">{post.content}</p>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="capitalize">{post.mode ?? 'unknown'}</span>
                <span>{post.posted_at ? new Date(post.posted_at).toLocaleDateString() : post.status}</span>
              </div>
            </div>
            <div className="shrink-0 w-40 space-y-1.5">
              <ScoreBar score={post.engagement_score} color="bg-blue-400" />
              <ScoreBar score={post.authority_score} color="bg-emerald-400" />
            </div>
            <div className="shrink-0 flex flex-col gap-1.5 text-right">
              {post.status !== 'posted' && (
                <button
                  onClick={() => handleMarkPosted(post.id)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded px-2 py-1"
                >
                  Mark Posted
                </button>
              )}
              <button
                onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                className="text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded px-2 py-1"
              >
                {expandedId === post.id ? 'Hide' : 'Stats'}
              </button>
            </div>
          </div>

          {expandedId === post.id && (
            <MetricsForm post={post} onSaved={handleSaved} />
          )}
        </div>
      ))}
    </div>
  )
}
