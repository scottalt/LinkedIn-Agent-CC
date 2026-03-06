import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/llm'
import { getStylePack, updateStylePack } from '@/lib/db/queries/style-pack'
import { createTemplate } from '@/lib/db/queries/templates'
import { createIngestSession, updateIngestSession } from '@/lib/db/queries/ingest'

const INGEST_SYSTEM = `You are a writing style analyzer. Extract patterns from LinkedIn posts written by one author.`

const INGEST_USER = (posts: string) => `Analyze these LinkedIn posts and extract the author's writing patterns.

POSTS:
${posts}

Return valid JSON with this exact shape:
{
  "hook_types": ["contrarian" | "stat" | "story" | "question" | "list"],
  "avg_line_count": number,
  "cta_patterns": string[],
  "hashtag_patterns": string[],
  "opener_patterns": string[],
  "closer_patterns": string[],
  "banned_phrase_candidates": string[],
  "suggested_templates": [
    {
      "name": string,
      "hook_type": "contrarian" | "stat" | "story" | "question" | "list" | "none",
      "structure": [{"type": "hook"|"body"|"list"|"closer", "label": string}],
      "closer_type": "question" | "soft_cta" | "none",
      "mode_affinity": "engagement" | "authority" | "both"
    }
  ]
}

Output only the JSON.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { rawInput, commit = false, sessionId } = body as {
      rawInput?: string
      commit?: boolean
      sessionId?: string
    }

    // Commit a previously analyzed session
    if (commit && sessionId) {
      const { updateIngestSession: update } = await import('@/lib/db/queries/ingest')
      const ingest = (await import('@/lib/db/queries/ingest')).getRecentIngestSessions(20)
      const session = ingest.find((s) => s.id === sessionId)
      if (!session || !session.extracted_patterns) {
        return NextResponse.json({ error: 'Session not found or not analyzed' }, { status: 404 })
      }

      const patterns = JSON.parse(session.extracted_patterns)
      const stylePack = getStylePack()
      const existingBanned: string[] = JSON.parse(stylePack.banned_phrases)

      // Merge banned phrases
      const newBanned = Array.from(
        new Set([...existingBanned, ...(patterns.banned_phrase_candidates ?? [])])
      )
      updateStylePack({ banned_phrases: JSON.stringify(newBanned) })

      // Create suggested templates
      const created: string[] = []
      for (const t of patterns.suggested_templates ?? []) {
        const template = createTemplate({
          name: t.name,
          hook_type: t.hook_type,
          structure: t.structure,
          closer_type: t.closer_type,
          mode_affinity: t.mode_affinity,
        })
        created.push(template.id)
      }

      updateIngestSession(sessionId, { committed: 1 })
      return NextResponse.json({ ok: true, templatesCreated: created.length })
    }

    if (!rawInput?.trim()) {
      return NextResponse.json({ error: 'rawInput required' }, { status: 400 })
    }

    const session = createIngestSession(rawInput)
    const provider = getProvider()

    const raw = await provider.generate(
      [
        { role: 'system', content: INGEST_SYSTEM },
        { role: 'user', content: INGEST_USER(rawInput) },
      ],
      { temperature: 0.3, maxTokens: 2000 }
    )

    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const patterns = JSON.parse(cleaned)

    // Count posts
    const postCount = rawInput.split(/\n---+\n|\n={3,}\n/).length

    await updateIngestSession(session.id, {
      extracted_patterns: JSON.stringify(patterns),
      posts_parsed: postCount,
    })

    return NextResponse.json({ sessionId: session.id, patterns })
  } catch (err) {
    console.error('[/api/ingest]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ingest failed' },
      { status: 500 }
    )
  }
}
