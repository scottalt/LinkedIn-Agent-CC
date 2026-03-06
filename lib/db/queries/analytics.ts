import { getDb } from '../index'
import { AnalyticsSnapshot } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { getEngagementWeights } from './settings'

export function computeEngagementScore(metrics: {
  impressions: number
  likes: number
  comments: number
  reposts: number
  saves: number
}): number {
  if (!metrics.impressions) return 0
  const w = getEngagementWeights()
  const raw =
    (metrics.saves * w.saves +
      metrics.comments * w.comments +
      metrics.reposts * w.reposts +
      metrics.likes * w.likes) /
    metrics.impressions *
    1000
  return Math.min(100, Math.round(raw * 10) / 10)
}

export function computeAuthorityScore(
  metrics: Parameters<typeof computeEngagementScore>[0],
  authorityOverride: boolean
): number {
  const base = computeEngagementScore(metrics)
  return Math.min(100, Math.round((base + (authorityOverride ? 25 : 0)) * 10) / 10)
}

export function saveSnapshot(data: {
  post_id: string
  impressions: number
  likes: number
  comments: number
  reposts: number
  saves: number
  source: 'manual' | 'playwright'
}): AnalyticsSnapshot {
  const db = getDb()
  const id = uuidv4()
  const ts = new Date().toISOString()
  const engagementScore = computeEngagementScore(data)
  const post = db.prepare('SELECT authority_override FROM posts WHERE id = ?').get(data.post_id) as
    | { authority_override: number }
    | null
  const authorityScore = computeAuthorityScore(data, post?.authority_override === 1)

  db.prepare(
    `INSERT INTO analytics_snapshots
      (id, post_id, captured_at, impressions, likes, comments, reposts, saves, engagement_score, authority_score, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.post_id,
    ts,
    data.impressions,
    data.likes,
    data.comments,
    data.reposts,
    data.saves,
    engagementScore,
    authorityScore,
    data.source
  )

  // Update the post with latest metrics
  db.prepare(
    `UPDATE posts SET
      impressions = ?, likes = ?, comments = ?, reposts = ?, saves = ?,
      engagement_score = ?, authority_score = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    data.impressions,
    data.likes,
    data.comments,
    data.reposts,
    data.saves,
    engagementScore,
    authorityScore,
    ts,
    data.post_id
  )

  return db.prepare('SELECT * FROM analytics_snapshots WHERE id = ?').get(id) as AnalyticsSnapshot
}

export function getSnapshotsForPost(postId: string): AnalyticsSnapshot[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM analytics_snapshots WHERE post_id = ? ORDER BY captured_at DESC')
    .all(postId) as AnalyticsSnapshot[]
}
