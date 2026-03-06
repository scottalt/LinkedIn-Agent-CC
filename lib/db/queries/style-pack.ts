import { getDb } from '../index'
import { StylePack } from '../types'

export function getStylePack(): StylePack {
  const db = getDb()
  return db.prepare("SELECT * FROM style_pack WHERE id = 'default'").get() as StylePack
}

export function updateStylePack(
  data: Partial<Omit<StylePack, 'id' | 'version' | 'updated_at'>>
): StylePack {
  const db = getDb()
  const fields = Object.keys(data)
  if (fields.length === 0) return getStylePack()

  const setClause = [...fields.map((f) => `${f} = ?`), 'version = version + 1', "updated_at = datetime('now')"].join(', ')
  const values = fields.map((f) => (data as Record<string, unknown>)[f])

  db.prepare(`UPDATE style_pack SET ${setClause} WHERE id = 'default'`).run(...values)
  return getStylePack()
}
