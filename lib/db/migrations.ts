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
  {
    version: 4,
    up(db) {
      // Replace style pack with Scott's actual voice patterns
      const bannedPhrases = [
        // AI tells
        'excited to share',
        'thrilled to share',
        'thrilled to announce',
        'delighted to',
        'honored to',
        'humbled by',
        'humbled to',
        'passionate about',
        "let's connect",
        "let's dive in",
        "let's talk about",
        "let's explore",
        "in today's world",
        "in today's landscape",
        "in the current landscape",
        'game-changer',
        'game changer',
        'innovative',
        'innovation',
        'synergy',
        'leverage',
        'actionable insights',
        'transformative',
        'moving the needle',
        'low-hanging fruit',
        'circle back',
        'bandwidth',
        'thought leadership',
        'ecosystem',
        'holistic approach',
        'best practices',
        'paradigm shift',
        'elevate',
        'empower',
        'journey',
        'the security space',
        'this space',
        'in this post',
        "today I want to talk about",
        "today I'm sharing",
        'excited',
        // Fake engagement
        'follow for more',
        'follow me for',
        'dm me',
        'repost if you agree',
        'like if you agree',
        'comment below',
        'drop a comment',
        'what do you think',
        'share your thoughts',
        // Hedging / corporate
        'it goes without saying',
        'at the end of the day',
        "it's worth noting",
        'needless to say',
        'as we all know',
        'as you may know',
        'in my humble opinion',
        'with that being said',
      ]

      const voiceExamples = [
        `Most Entra tenants are a mess underneath the surface.

Apps registered years ago by people who left. Service principals with permissions nobody remembers granting. Enterprise applications with no owner, no activity, and full access to your tenant.

Nobody flagged it. Nobody cleaned it up. It just accumulated.

And dormant high-privilege apps are exactly what attackers look for when they are already inside.

I built Enterprise-Zapp to surface exactly this. Point it at your tenant and it gets you a full inventory of app registrations, orphaned enterprise apps, and risky service principals, with risk ratings and a clean report you can actually act on.

Open source, free to run, takes about 5 minutes to set up. Full instructions on the GitHub.

Curious to hear if it's helpful for your teams. If you spot any bugs or run into any issues, let me know.

I'll share a blog post with the full breakdown in the comments for those who want more context.`,

        `Cybersecurity students: the fastest way to waste a class project is to treat it like a class project.

A lot of students say they "don't have experience." I get why, but it's not entirely true. You've already done real work. It just gets packaged like homework instead of something someone could actually use, review, and trust.

Academia isn't useless. It's great at forcing you to read, write, and think. But interviews don't reward "I learned about X." They reward "I built Y, here's how it works, here's what I'd change, here's what I couldn't solve." That's not elitism. It's how trust gets formed when the job involves access, outages, and consequences.

So yes, keep the research and the citations. Then add the part school rarely demands. Publish the repo. Document the assumptions. Include sample data. Show the test that proves the thing does what you claim.

If it's a threat model, include a diagram and the top three abuse cases you'd actually prioritize. If it's a detection, show the logs and the tuning notes.

That's how school work turns into project work, and project work turns into "experience" people can evaluate. Not everyone will care, and that's fine. The people you want to work for will.`,

        `Hiring managers don't hate juniors. They hate unpaid training programs, and they don't always say it.

If you want an entry-level security role but your company has no time set aside for onboarding, no senior coverage for review, and no tolerance for slower tickets for 90 days, then you don't have an entry-level role. You have a wishlist.

The part people avoid saying out loud is that "entry-level" is a budget line. It's mentorship hours, lab time, documented processes, and someone senior sitting with a new hire while they learn why a thousand login failures is either nothing or everything. If you won't fund that, stop posting "0-2 years" and calling it entry-level.

And before someone says "but we're lean," yes, that's exactly why pretend-junior roles don't work. Lean teams need contributors, not miracles.

This investment is still worth it. The best engineers of tomorrow are waiting for their first real opportunity, and they don't get there without support.

And to the juniors, if you get an opportunity like this, don't squander it. Do your best, learn as much as you can, and become useful as fast as you can.`,

        `Universities keep telling cybersecurity students the same story:
Get the degree. Stack certs. Walk into a security job.

Then you graduate and the "entry-level" posting wants SIEM experience, Active Directory basics, and someone who can explain why login failures are spiking.

Meanwhile you wrote a paper on the CIA triad.

That gap isn't personal. It's business. So you close it.

How to do it without trying to learn everything:

Pick one focus area for a month. For example: SIEM, Email Security, Identity.

Ship something a hiring manager can click. A GitHub repo with a simple log parser. A short write-up: ingest Windows Security logs and build a few detections. A home lab diagram with notes on what broke and how you fixed it. Does not need to be crazy. Just do something practical.

Get closer to real ops. Helpdesk, NOC, sysadmin internship, part-time IT. Most junior security work is IT fundamentals with higher stakes and more logging.

Learn the boring stuff that burns companies: Email security (SPF/DKIM/DMARC). Identity and MFA. Asset inventory. Centralized logging and alert triage.

If your program skips that, don't wait for the syllabus. The job market won't.`,

        `Security analysts who never touch offensive work are at a disadvantage.

You can study logs all day, read reports, pass certs, run playbooks — but until you've tried to exploit a real system, you won't truly understand what attackers target, how they think, or how they get around controls.

Offensive knowledge makes you better at defense.

I'm not saying you need to be an expert or start preparing for your OSCP, but even some TryHackMe or Hack The Box labs will have you feeling a lot more confident.

When a new CVE is released, you want to be able to visually understand how it can be used or chained by an attacker to break into a system. That is much more valuable than the CVSS score attached to it. It will help you dynamically prioritize remediation efforts.

#cybersecurity #infosec`,
      ]

      db.prepare(
        `UPDATE style_pack SET
          banned_phrases = ?,
          voice_examples = ?,
          hashtag_rules = ?,
          line_length_target = ?,
          max_hashtags = ?,
          formatting_rules = ?,
          version = version + 1,
          updated_at = datetime('now')
        WHERE id = 'default'`
      ).run(
        JSON.stringify(bannedPhrases),
        JSON.stringify(voiceExamples),
        JSON.stringify({
          min: 0,
          max: 3,
          preferred_tags: ['cybersecurity', 'infosec', 'identity', 'security'],
        }),
        9,
        3,
        JSON.stringify({
          no_em_dash: true,
          short_sentences: true,
          active_voice: true,
          no_buzzwords: true,
          no_exclamation_points: true,
          no_forced_engagement: true,
        })
      )

      // Add templates matching Scott's actual post structures
      const insertTemplate = db.prepare(
        `INSERT OR IGNORE INTO templates
          (id, name, hook_type, structure, closer_type, mode_affinity, created_at, is_seed)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 1)`
      )

      const scottTemplates: [string, string, string, string, string, string][] = [
        [
          'scott-1',
          'Problem Accumulation Risk',
          'contrarian',
          JSON.stringify([
            { type: 'hook', label: 'State what most X look like underneath (specific, not generic)' },
            { type: 'body', label: 'Evidence of accumulation — list what piles up and why nobody notices' },
            { type: 'body', label: 'The security/business consequence of that accumulation' },
            { type: 'closer', label: 'What you built or did about it, or what the reader should do' },
          ]),
          'soft_cta',
          'both',
        ],
        [
          'scott-2',
          'Say the Quiet Part',
          'contrarian',
          JSON.stringify([
            { type: 'hook', label: 'Name what people think is true but reframe it ("X don\'t hate Y. They hate Z.")' },
            { type: 'body', label: 'Unpack what people won\'t say out loud — the real dynamic' },
            { type: 'body', label: 'The structural reason it happens (budget, incentives, org design)' },
            { type: 'closer', label: 'Advice to both sides, or just let the observation land' },
          ]),
          'none',
          'engagement',
        ],
        [
          'scott-3',
          'Gap and Bridge',
          'contrarian',
          JSON.stringify([
            { type: 'hook', label: 'Name what the institution/employer/market tells people (then show the gap)' },
            { type: 'body', label: 'What actually happens when they follow that advice' },
            { type: 'list', label: '4-5 specific, practical steps to close the gap (not generic advice)' },
            { type: 'closer', label: 'Consequence of not acting, or just close on the last step' },
          ]),
          'none',
          'engagement',
        ],
        [
          'scott-4',
          'Contrarian Claim',
          'contrarian',
          JSON.stringify([
            { type: 'hook', label: '[Group] who never [do X] are at a disadvantage — state it flat' },
            { type: 'body', label: 'Why that\'s true — 2-3 lines, specific, no hedging' },
            { type: 'body', label: 'What to do instead — practical, not "just Google it"' },
            { type: 'closer', label: 'The specific benefit. No CTA.' },
          ]),
          'none',
          'authority',
        ],
        [
          'scott-5',
          'Project Announcement',
          'stat',
          JSON.stringify([
            { type: 'hook', label: 'State the problem state that made you build this (specific, not abstract)' },
            { type: 'body', label: 'Show the symptoms — what accumulates, what nobody notices, what it costs' },
            { type: 'body', label: 'What you built, what it does, how to get it (concrete details)' },
            { type: 'closer', label: 'Genuine ask — curious if it helps, report bugs, share context in comments' },
          ]),
          'soft_cta',
          'engagement',
        ],
      ]

      for (const t of scottTemplates) {
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
