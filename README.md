# LinkedIn Agent

A local web app for generating, managing, scheduling, and publishing LinkedIn posts in your voice. Runs on `localhost`.

## Features

- **Composer** — Generate 1-5 post variations from a topic. Mode selector (engagement vs authority), CTA style, template support. Tighten pass and guardrail checker per variation.
- **Templates** — 6 built-in seed templates (3 engagement, 3 authority). Create custom templates with block structures.
- **Style Center** — Manage banned phrases, hashtag rules, and voice examples. Ingest existing posts to extract patterns and update your style pack automatically.
- **Scheduler** — Schedule approved posts with a datetime picker (reminder only — posting is manual). Copy text to clipboard. Mark as Posted.
- **Analytics** — Enter stats manually per post. Computes engagement and authority scores (0-100) using configurable weights.
- **Dashboard** — Mix meter, upcoming queue, pending drafts, recent posts with scores.
- **Settings** — LLM provider (OpenAI or Anthropic), model, API keys, engagement weights, post mix target.

## Stack

- **Framework**: Next.js 15 App Router, TypeScript strict
- **Styling**: Tailwind CSS v4
- **Database**: SQLite via `better-sqlite3` (local file, never committed)
- **AI**: OpenAI SDK (default `gpt-4o`) or Anthropic SDK, swappable via Settings

## Setup

```bash
npm install

# Copy and fill in at minimum one API key
cp .env.local.example .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

API keys can be set in `.env.local`:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

Or saved directly in Settings (stored in the local SQLite DB, never committed to git).

## Data

- Database: `data/linkedin-agent.db` (auto-created on first run)
- Uploads: `data/uploads/` (for future image post support)
- Both directories are gitignored

## Posting Flow

```
draft → approved → scheduled (optional) → [copy to clipboard] → [post manually on LinkedIn] → mark as posted
```

No automatic publishing. The app generates, stores, and tracks — you post.
