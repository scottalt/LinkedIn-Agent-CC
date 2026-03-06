import { getDb } from '../index'

export function getSetting(key: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | null
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

export function getAllSettings(): Record<string, string> {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export function getEngagementWeights(): { saves: number; comments: number; reposts: number; likes: number } {
  const raw = getSetting('engagement_weights')
  return raw ? JSON.parse(raw) : { saves: 4, comments: 3, reposts: 2, likes: 1 }
}
