# LinkedIn Agent — Design Document

**Date:** 2026-03-04
**Status:** Approved

---

## Overview

A local web app (runs on `localhost`) for generating, managing, scheduling, and publishing LinkedIn posts in Scott's voice. Core value is high-quality generation and a fast draft-to-posted workflow. Posting is manual (user publishes on LinkedIn), with optional Playwright automation for saving LinkedIn drafts and fetching engagement stats.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | SQLite via `better-sqlite3` |
| AI | OpenAI SDK (default), abstracted via `LLMProvider` interface |
| Browser automation | Playwright (optional, opt-in) |
| Package manager | npm |

---

## Directory Structure

```
app/
  (routes)/
    dashboard/
    composer/
    templates/
    scheduler/
    analytics/
    settings/
  api/
    generate/          ← LLM calls (generate variations, tighten, guardrail check)
    posts/             ← CRUD + status transitions
    schedule/          ← queue management
    analytics/         ← ingest metrics + compute scores
    ingest/            ← parse pasted posts → extract patterns
    publish/           ← copy payload + optional Playwright draft-save
    playwright-stats/  ← optional engagement stat fetch

lib/
  db/                  ← better-sqlite3 wrapper, migrations, typed queries
  llm/                 ← LLMProvider interface + OpenAI/Anthropic implementations
  voice/               ← system prompt builder, banned phrases, guardrail checker
  scoring/             ← engagement score + authority score formulas (configurable)
  playwright/          ← optional: save LinkedIn draft + fetch stats
  templates/           ← seed templates + template renderer

data/
  linkedin-agent.db    ← SQLite file (gitignored)
  uploads/             ← image attachments (gitignored)
```

---

## Data Model

### `posts`
```sql
id                TEXT PRIMARY KEY,
content           TEXT NOT NULL,
first_comment     TEXT,
mode              TEXT CHECK(mode IN ('engagement', 'authority')),
status            TEXT CHECK(status IN ('draft','approved','scheduled','draft_saved','posted','failed')),
post_type         TEXT CHECK(post_type IN ('text','image')),
image_path        TEXT,
scheduled_at      TEXT,               -- ISO8601
posted_at         TEXT,               -- ISO8601, set manually or via "Mark as Posted"
created_at        TEXT NOT NULL,
updated_at        TEXT NOT NULL,
template_id       TEXT,
idempotency_key   TEXT UNIQUE,
-- analytics
impressions       INTEGER DEFAULT 0,
likes             INTEGER DEFAULT 0,
comments          INTEGER DEFAULT 0,
reposts           INTEGER DEFAULT 0,
saves             INTEGER DEFAULT 0,
engagement_score  REAL DEFAULT 0,
authority_score   REAL DEFAULT 0,
authority_override INTEGER DEFAULT 0  -- boolean
```

### `templates`
```sql
id                  TEXT PRIMARY KEY,
name                TEXT NOT NULL,
hook_type           TEXT,             -- question | stat | story | contrarian | list
structure           TEXT,             -- JSON: array of block descriptors
closer_type         TEXT,             -- question | soft_cta | none
mode_affinity       TEXT,             -- engagement | authority | both
avg_engagement_score REAL DEFAULT 0,
avg_authority_score  REAL DEFAULT 0,
use_count           INTEGER DEFAULT 0,
created_at          TEXT NOT NULL,
is_seed             INTEGER DEFAULT 0 -- marks built-in templates
```

### `style_pack`
```sql
id                  TEXT PRIMARY KEY DEFAULT 'default',
version             INTEGER NOT NULL DEFAULT 1,
banned_phrases      TEXT NOT NULL,    -- JSON array
hashtag_rules       TEXT NOT NULL,    -- JSON: { min, max, preferred_tags }
line_length_target  INTEGER DEFAULT 8, -- max words per line
max_hashtags        INTEGER DEFAULT 4,
formatting_rules    TEXT NOT NULL,    -- JSON: { no_em_dash, short_sentences, etc. }
voice_examples      TEXT NOT NULL,    -- JSON array of raw post strings
updated_at          TEXT NOT NULL
```

### `analytics_snapshots`
```sql
id            TEXT PRIMARY KEY,
post_id       TEXT NOT NULL REFERENCES posts(id),
captured_at   TEXT NOT NULL,
impressions   INTEGER,
likes         INTEGER,
comments      INTEGER,
reposts       INTEGER,
saves         INTEGER,
engagement_score REAL,
authority_score  REAL,
source        TEXT CHECK(source IN ('manual','playwright'))
```

### `ingest_sessions`
```sql
id                  TEXT PRIMARY KEY,
created_at          TEXT NOT NULL,
raw_input           TEXT NOT NULL,
extracted_patterns  TEXT,             -- JSON
posts_parsed        INTEGER,
committed           INTEGER DEFAULT 0 -- whether patterns were applied
```

### `settings`
```sql
key   TEXT PRIMARY KEY,
value TEXT NOT NULL
```
Key rows: `llm_provider`, `llm_model`, `openai_api_key`, `playwright_enabled`,
`engagement_weights`, `mix_target_engagement`, `mix_target_authority`, `posting_time_windows`

---

## LLM Provider Abstraction

```typescript
interface LLMProvider {
  provider: 'openai' | 'anthropic' | 'ollama'
  model: string
  generate(messages: Message[], options?: GenerateOptions): Promise<string>
}
```

The `/api/generate` route instantiates the configured provider at request time. Swapping providers is a settings change — no code change needed. Default: `gpt-4o`.

---

## Voice System

**System prompt builder** (`lib/voice/prompt-builder.ts`):
Constructs a system prompt from:
- Style pack (banned phrases, formatting rules, voice examples)
- Mode (engagement vs authority)
- CTA style (question | soft_cta | none)
- Target audience (optional freetext)
- Template structure (if a template is selected)

Rebuilt fresh per call — updating the style pack takes effect immediately.

**Guardrail checker** (`lib/voice/guardrail.ts`):
Scans generated text for:
- Banned phrases (exact + fuzzy match)
- AI tell patterns ("in today's world", "delighted", "let's connect", "game-changer", em dashes, etc.)
- Structural violations (lines too long, too many hashtags)

Returns `{ status: 'pass' | 'warn' | 'fail', violations: string[] }`.

**Tighten** (`lib/voice/tighten.ts`):
Secondary LLM pass targeting ~20% word reduction. Preserves meaning, increases punch. Runs via same `LLMProvider`.

---

## Two-Track Scoring

**Engagement score** (0–100):
```
score = (saves × w_saves + comments × w_comments + reposts × w_reposts + likes × w_likes)
        / impressions × 1000
```
Weights configurable in settings (defaults: saves=4, comments=3, reposts=2, likes=1).

**Authority score** (0–100):
- Computed identically by default
- `authority_override = true` adds a +25 bump
- Authority posts are **excluded from the engagement template ranking query**
- Template selection for authority mode sorts by `avg_authority_score DESC` on authority-affinity templates only

**Mix meter** (Dashboard):
Tracks `engagement_posts / authority_posts` over last 30 days against the configured target ratio (default 3:2). Composer warns when ratio is off.

---

## Posting Flow

```
draft → approved → scheduled (optional, just a timestamp) → draft_saved → posted
                                                          ↘ failed
```

1. Composer generates 3–5 variations
2. User edits, tightens, checks guardrails, approves
3. User sets scheduled time (informational — no auto-publish)
4. Options on the post card:
   - **Copy text** — clipboard
   - **Save to LinkedIn Drafts** (Playwright, if enabled) — saves draft on LinkedIn, sets status `draft_saved`
5. User publishes manually on LinkedIn
6. User clicks **"Mark as Posted"** — sets `posted_at`, status `posted`, records idempotency key
7. Idempotency: app blocks "Save to LinkedIn Drafts" if status is already `draft_saved`

---

## Stats Entry

**Default (manual):**
Post card in Analytics screen has editable fields: impressions, likes, comments, reposts, saves. Saving recomputes both scores and writes an `analytics_snapshots` row.

**Opt-in (Playwright):**
"Fetch via Playwright" button in Analytics or Settings. Navigates to linkedin.com/analytics, scrapes post metrics, populates fields. User must acknowledge TOS risk in settings to enable. Runs on-demand only, not on a timer.

---

## Ingest Flow

1. User pastes 5–20 raw posts into the Ingest screen
2. `/api/ingest` sends to LLM with structured extraction prompt
3. LLM returns: `{ hook_types[], avg_line_count, cta_patterns[], hashtag_patterns, opener_patterns[], closer_patterns[], banned_phrase_candidates[] }`
4. App shows diff: "These patterns will be added to your style pack and templates"
5. User reviews and commits — no silent overwrites
6. New templates created from extracted structures, existing style pack version-bumped

---

## Screens

| Screen | Key components |
|---|---|
| Dashboard | Scheduled queue (7 days), drafts needing approval, last 10 posts + scores, mix meter |
| Composer | Topic input, mode selector, CTA style, post type, generate button, variation cards, guardrail badge, tighten button, first comment editor, approve + schedule |
| Templates | Template library cards, create/edit template, mode affinity tag |
| Style Center | Banned phrases editor, hashtag rules, voice examples, ingest button |
| Scheduler | Calendar + queue list, scheduling rules config, mix strategy editor |
| Analytics | Posts table + metrics, breakdown charts (hook type / length / mode / image vs text), insights panel, manual stats entry, opt-in Playwright fetch |
| Settings | LLM provider/model, API key, engagement weights, Playwright toggle, posting time windows |

---

## Seed Templates

### Engagement Mode
1. **Hot take** — contrarian opener + 3-line argument + question closer
2. **Lesson learned** — story hook + mistake + what I'd do differently + soft CTA
3. **List post** — stat or claim hook + 4–6 short bullets + question

### Authority Mode
1. **Concept explainer** — "Most people think X. Here's what's actually happening." + 4–6 lines + no CTA
2. **Framework post** — problem + structured breakdown + summary line
3. **War story** — incident narrative + root cause + what it taught me

---

## Defaults Documented

- LLM: `gpt-4o`, provider: `openai`
- Engagement weights: saves=4, comments=3, reposts=2, likes=1
- Mix target: 3 engagement : 2 authority per week
- Max hashtags: 4
- Line length target: 8 words
- Playwright: disabled by default
- Stats source: manual by default
- Posting: manual only by default
