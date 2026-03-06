import { getDb } from '../index'
import { IngestSession } from '../types'
import { v4 as uuidv4 } from 'uuid'

export function createIngestSession(rawInput: string): IngestSession {
  const db = getDb()
  const id = uuidv4()
  const ts = new Date().toISOString()
  db.prepare(
    'INSERT INTO ingest_sessions (id, created_at, raw_input) VALUES (?, ?, ?)'
  ).run(id, ts, rawInput)
  return db.prepare('SELECT * FROM ingest_sessions WHERE id = ?').get(id) as IngestSession
}

export function updateIngestSession(
  id: string,
  data: { extracted_patterns?: string; posts_parsed?: number; committed?: number }
): IngestSession {
  const db = getDb()
  const fields = Object.keys(data)
  const setClause = fields.map((f) => `${f} = ?`).join(', ')
  const values = fields.map((f) => (data as Record<string, unknown>)[f])
  values.push(id)
  db.prepare(`UPDATE ingest_sessions SET ${setClause} WHERE id = ?`).run(...values)
  return db.prepare('SELECT * FROM ingest_sessions WHERE id = ?').get(id) as IngestSession
}

export function getRecentIngestSessions(limit = 10): IngestSession[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM ingest_sessions ORDER BY created_at DESC LIMIT ?')
    .all(limit) as IngestSession[]
}
