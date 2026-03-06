import { getDb } from '../index'
import { Template, ModeAffinity, HookType, CloserType } from '../types'
import { v4 as uuidv4 } from 'uuid'

export function listTemplates(mode?: ModeAffinity): Template[] {
  const db = getDb()
  if (mode && mode !== 'both') {
    return db
      .prepare(`SELECT * FROM templates WHERE mode_affinity = ? OR mode_affinity = 'both' ORDER BY use_count DESC`)
      .all(mode) as Template[]
  }
  return db.prepare('SELECT * FROM templates ORDER BY use_count DESC').all() as Template[]
}

export function getTemplateById(id: string): Template | null {
  const db = getDb()
  return db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Template | null
}

export function createTemplate(data: {
  name: string
  hook_type?: HookType
  structure: object[]
  closer_type?: CloserType
  mode_affinity?: ModeAffinity
}): Template {
  const db = getDb()
  const id = uuidv4()
  const ts = new Date().toISOString()
  db.prepare(
    `INSERT INTO templates (id, name, hook_type, structure, closer_type, mode_affinity, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name,
    data.hook_type ?? null,
    JSON.stringify(data.structure),
    data.closer_type ?? null,
    data.mode_affinity ?? null,
    ts
  )
  return getTemplateById(id)!
}

export function updateTemplate(id: string, data: Partial<Omit<Template, 'id' | 'created_at' | 'is_seed'>>): Template | null {
  const db = getDb()
  const fields = Object.keys(data)
  if (fields.length === 0) return getTemplateById(id)
  const setClause = fields.map((f) => `${f} = ?`).join(', ')
  const values = fields.map((f) => (data as Record<string, unknown>)[f])
  values.push(id)
  db.prepare(`UPDATE templates SET ${setClause} WHERE id = ?`).run(...values)
  return getTemplateById(id)
}

export function deleteTemplate(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM templates WHERE id = ? AND is_seed = 0').run(id)
}

export function incrementTemplateUseCount(id: string): void {
  const db = getDb()
  db.prepare('UPDATE templates SET use_count = use_count + 1 WHERE id = ?').run(id)
}

export function updateTemplateScores(
  id: string,
  engagementScore: number,
  authorityScore: number
): void {
  const db = getDb()
  db.prepare(
    'UPDATE templates SET avg_engagement_score = ?, avg_authority_score = ? WHERE id = ?'
  ).run(engagementScore, authorityScore, id)
}
