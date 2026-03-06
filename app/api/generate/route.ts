import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/llm'
import { buildSystemPrompt, buildUserPrompt, parseVariations } from '@/lib/voice/prompt-builder'
import { tightenPost } from '@/lib/voice/tighten'
import { checkGuardrails } from '@/lib/voice/guardrail'
import { getStylePack } from '@/lib/db/queries/style-pack'
import { getTemplateById } from '@/lib/db/queries/templates'
import type { PostMode, CloserType } from '@/lib/db/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      topic,
      mode = 'engagement',
      ctaStyle = 'question',
      targetAudience,
      templateId,
      variationCount = 3,
      action = 'generate', // 'generate' | 'tighten'
      content, // for tighten action
    } = body as {
      topic?: string
      mode?: PostMode
      ctaStyle?: CloserType
      targetAudience?: string
      templateId?: string
      variationCount?: number
      action?: 'generate' | 'tighten'
      content?: string
    }

    const provider = getProvider()
    const stylePack = getStylePack()

    if (action === 'tighten') {
      if (!content) {
        return NextResponse.json({ error: 'content required for tighten' }, { status: 400 })
      }
      const tightened = await tightenPost(content, provider)
      const guardrail = checkGuardrails(tightened, stylePack)
      return NextResponse.json({ tightened, guardrail })
    }

    if (!topic) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 })
    }

    const template = templateId ? getTemplateById(templateId) : null
    const templateStructure = template ? JSON.parse(template.structure) : undefined

    const systemPrompt = buildSystemPrompt(stylePack)
    const userPrompt = buildUserPrompt({
      stylePack,
      mode,
      ctaStyle,
      targetAudience,
      templateStructure,
      topic,
      variationCount,
    })

    const raw = await provider.generate(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.8, maxTokens: 3000 }
    )

    const variations = parseVariations(raw)
    const results = variations.map((v) => ({
      content: v,
      guardrail: checkGuardrails(v, stylePack),
    }))

    return NextResponse.json({ variations: results })
  } catch (err) {
    console.error('[/api/generate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
