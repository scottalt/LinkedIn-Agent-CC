import { getDb } from '../index'
import { Post, PostMode, PostStatus } from '../types'
import { v4 as uuidv4 } from 'uuid'

function now() {
  return new Date().toISOString()
}

export function createPost(data: {
  content: string
  mode?: PostMode
  post_type?: 'text' | 'image'
  template_id?: string
  first_comment?: string
}): Post {
  const db = getDb()
  const id = uuidv4()
  const ts = now()
  db.prepare(
    `INSERT INTO posts (id, content, mode, post_type, template_id, first_comment, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
  ).run(id, data.content, data.mode ?? null, data.post_type ?? 'text', data.template_id ?? null, data.first_comment ?? null, ts, ts)
  return getPostById(id)!
}

export function getPostById(id: string): Post | null {
  const db = getDb()
  return db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as Post | null
}

export function listPosts(opts: {
  status?: PostStatus | PostStatus[]
  mode?: PostMode
  limit?: number
  offset?: number
} = {}): Post[] {
  const db = getDb()
  const conditions: string[] = []
  const params: unknown[] = []

  if (opts.status) {
    const statuses = Array.isArray(opts.status) ? opts.status : [opts.status]
    conditions.push(`status IN (${statuses.map(() => '?').join(',')})`)
    params.push(...statuses)
  }
  if (opts.mode) {
    conditions.push('mode = ?')
    params.push(opts.mode)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  return db
    .prepare(`SELECT * FROM posts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as Post[]
}

export function updatePost(id: string, data: Partial<Omit<Post, 'id' | 'created_at'>>): Post | null {
  const db = getDb()
  const fields = Object.keys(data).filter((k) => k !== 'id' && k !== 'created_at')
  if (fields.length === 0) return getPostById(id)

  const setClause = fields.map((f) => `${f} = ?`).join(', ')
  const values = fields.map((f) => (data as Record<string, unknown>)[f])
  values.push(now(), id)

  db.prepare(`UPDATE posts SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values)
  return getPostById(id)
}

export function updatePostStatus(id: string, status: PostStatus, extra?: Record<string, unknown>): Post | null {
  return updatePost(id, { status, ...extra })
}

export function deletePost(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM posts WHERE id = ?').run(id)
}

export function getRecentPosted(days = 30): Post[] {
  const db = getDb()
  const since = new Date(Date.now() - days * 86400000).toISOString()
  return db
    .prepare(`SELECT * FROM posts WHERE status = 'posted' AND posted_at >= ? ORDER BY posted_at DESC`)
    .all(since) as Post[]
}

export function getScheduledQueue(days = 7): Post[] {
  const db = getDb()
  const from = new Date().toISOString()
  const to = new Date(Date.now() + days * 86400000).toISOString()
  return db
    .prepare(
      `SELECT * FROM posts WHERE status IN ('approved','scheduled') AND scheduled_at BETWEEN ? AND ? ORDER BY scheduled_at ASC`
    )
    .all(from, to) as Post[]
}

export function updateScores(id: string, engagementScore: number, authorityScore: number): void {
  const db = getDb()
  db.prepare(
    'UPDATE posts SET engagement_score = ?, authority_score = ?, updated_at = ? WHERE id = ?'
  ).run(engagementScore, authorityScore, now(), id)
}
