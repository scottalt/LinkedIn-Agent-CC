import Database from 'better-sqlite3'

function runSql(db: Database.Database, sql: string): void {
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  for (const stmt of statements) {
    db.prepare(stmt).run()
  }
}

const MIGRATIONS: { version: number; up: (db: Database.Database) => void }[] = [
  {
    version: 1,
    up(db) {
      runSql(
        db,
        `
        CREATE TABLE IF NOT EXISTS migrations (
          version    INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `
      )
      runSql(
        db,
        `
        CREATE TABLE IF NOT EXISTS settings (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `
      )
      runSql(
        db,
        `
        CREATE TABLE IF NOT EXISTS style_pack (
          id                  TEXT PRIMARY KEY DEFAULT 'default',
          version             INTEGER NOT NULL DEFAULT 1,
          banned_phrases      TEXT NOT NULL DEFAULT '[]',
          hashtag_rules       TEXT NOT NULL DEFAULT '{"min":0,"max":4,"preferred_tags":[]}',
          line_length_target  INTEGER DEFAULT 8,
          max_hashtags        INTEGER DEFAULT 4,
          formatting_rules    TEXT NOT NULL DEFAULT '{"no_em_dash":true,"short_sentences":true,"active_voice":true}',
          voice_examples      TEXT NOT NULL DEFAULT '[]',
          updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `
      )
      runSql(
        db,
        `
        CREATE TABLE IF NOT EXISTS templates (
          id                   TEXT PRIMARY KEY,
          name                 TEXT NOT NULL,
          hook_type            TEXT,
          structure            TEXT NOT NULL DEFAULT '[]',
          closer_type          TEXT,
          mode_affinity        TEXT,
          avg_engagement_score REAL DEFAULT 0,
          avg_authority_score  REAL DEFAULT 0,
          use_count            INTEGER DEFAULT 0,
          created_at           TEXT NOT NULL,
          is_seed              INTEGER DEFAULT 0
        )
      `
      )
      runSql(
        db,
        `
        CREATE TABLE IF NOT EXISTS posts (
          id                TEXT PRIMARY KEY,
          content           TEXT NOT NULL,
          first_comment     TEXT,
          mode              TEXT,
          status            TEXT NOT NULL DEFAULT 'draft',
          post_type         TEXT NOT NULL DEFAULT 'text',
          image_path        TEXT,
          scheduled_at      TEXT,
          posted_at         TEXT,
          created_at        TEXT NOT NULL,
          updated_at        TEXT NOT NULL,
          template_id       TEXT REFERENCES templates(id),
          idempotency_key   TEXT UNIQUE,
          impressions       INTEGER DEFAULT 0,
          likes             INTEGER DEFAULT 0,
          comments          INTEGER DEFAULT 0,
          reposts           INTEGER DEFAULT 0,
          saves             INTEGER DEFAULT 0,
          engagement_score  REAL DEFAULT 0,
          authority_score   REAL DEFAULT 0,
          authority_override INTEGER DEFAULT 0
        )
      `
      )
      runSql(
        db,
        `
        CREATE TABLE IF NOT EXISTS analytics_snapshots (
          id               TEXT PRIMARY KEY,
          post_id          TEXT NOT NULL REFERENCES posts(id),
          captured_at      TEXT NOT NULL,
          impressions      INTEGER,
          likes            INTEGER,
          comments         INTEGER,
          reposts          INTEGER,
          saves            INTEGER,
          engagement_score REAL,
          authority_score  REAL,
          source           TEXT NOT NULL DEFAULT 'manual'
        )
      `
      )
      runSql(
        db,
        `
        CREATE TABLE IF NOT EXISTS ingest_sessions (
          id                  TEXT PRIMARY KEY,
          created_at          TEXT NOT NULL,
          raw_input           TEXT NOT NULL,
          extracted_patterns  TEXT,
          posts_parsed        INTEGER,
          committed           INTEGER DEFAULT 0
        )
      `
      )
    },
  },
  {
    version: 2,
    up(db) {
      // Seed default style pack
      db.prepare(
        `
        INSERT OR IGNORE INTO style_pack
          (id, version, banned_phrases, hashtag_rules, line_length_target, max_hashtags, formatting_rules, voice_examples, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `
      ).run(
        'default',
        1,
        JSON.stringify([
          'excited to share',
          'thrilled',
          'delighted',
          'game-changer',
          "let's connect",
          "in today's world",
          'innovative',
          'synergy',
          'leverage',
          'actionable insights',
          'transformative',
          'excited',
          'passionate',
          'honored',
          'humbled',
        ]),
        JSON.stringify({ min: 0, max: 4, preferred_tags: ['cybersecurity', 'infosec', 'identity', 'security', 'leadership'] }),
        8,
        4,
        JSON.stringify({ no_em_dash: true, short_sentences: true, active_voice: true, no_buzzwords: true }),
        JSON.stringify([])
      )

      // Seed default settings
      const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
      const seedSettings: [string, string][] = [
        ['llm_provider', 'openai'],
        ['llm_model', 'gpt-4o'],
        ['openai_api_key', ''],
        ['anthropic_api_key', ''],
        ['playwright_enabled', 'false'],
        ['engagement_weights', JSON.stringify({ saves: 4, comments: 3, reposts: 2, likes: 1 })],
        ['mix_target_engagement', '3'],
        ['mix_target_authority', '2'],
        ['posting_time_windows', JSON.stringify(['09:00', '12:00', '17:00'])],
      ]
      for (const [key, value] of seedSettings) {
        insertSetting.run(key, value)
      }
    },
  },
  {
    version: 3,
    up(db) {
      // Seed templates
      const insertTemplate = db.prepare(
        `INSERT OR IGNORE INTO templates
          (id, name, hook_type, structure, closer_type, mode_affinity, created_at, is_seed)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 1)`
      )
      const seedTemplates: [string, string, string, string, string, string][] = [
        [
          'seed-engagement-1',
          'Hot Take',
          'contrarian',
          JSON.stringify([
            { type: 'hook', label: 'Contrarian opener' },
            { type: 'body', label: '3-line argument' },
            { type: 'closer', label: 'Question to audience' },
          ]),
          'question',
          'engagement',
        ],
        [
          'seed-engagement-2',
          'Lesson Learned',
          'story',
          JSON.stringify([
            { type: 'hook', label: 'Story hook' },
            { type: 'body', label: 'The mistake' },
            { type: 'body', label: "What I'd do differently" },
            { type: 'closer', label: 'Soft CTA' },
          ]),
          'soft_cta',
          'engagement',
        ],
        [
          'seed-engagement-3',
          'List Post',
          'stat',
          JSON.stringify([
            { type: 'hook', label: 'Stat or claim' },
            { type: 'list', label: '4-6 short bullets' },
            { type: 'closer', label: 'Question' },
          ]),
          'question',
          'engagement',
        ],
        [
          'seed-authority-1',
          'Concept Explainer',
          'contrarian',
          JSON.stringify([
            { type: 'hook', label: 'Most people think X' },
            { type: 'body', label: "Here's what's actually happening" },
            { type: 'body', label: '4-6 explanation lines' },
          ]),
          'none',
          'authority',
        ],
        [
          'seed-authority-2',
          'Framework Post',
          'stat',
          JSON.stringify([
            { type: 'hook', label: 'The problem' },
            { type: 'body', label: 'Structured breakdown' },
            { type: 'body', label: 'Summary line' },
          ]),
          'none',
          'authority',
        ],
        [
          'seed-authority-3',
          'War Story',
          'story',
          JSON.stringify([
            { type: 'hook', label: 'Incident narrative' },
            { type: 'body', label: 'Root cause' },
            { type: 'body', label: 'What it taught me' },
          ]),
          'none',
          'authority',
        ],
      ]
      for (const t of seedTemplates) {
        insertTemplate.run(...t)
      }
    },
  },
]

export function runMigrations(db: Database.Database): void {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run()

  const applied = new Set(
    (db.prepare('SELECT version FROM migrations').all() as { version: number }[]).map(
      (r) => r.version
    )
  )

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue
    migration.up(db)
    db.prepare('INSERT INTO migrations (version) VALUES (?)').run(migration.version)
  }
}
