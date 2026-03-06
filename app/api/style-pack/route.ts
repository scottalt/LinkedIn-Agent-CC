import { NextRequest, NextResponse } from 'next/server'
import { getStylePack, updateStylePack } from '@/lib/db/queries/style-pack'

export async function GET() {
  return NextResponse.json({ stylePack: getStylePack() })
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const allowed = ['banned_phrases', 'hashtag_rules', 'voice_examples', 'formatting_rules', 'line_length_target', 'max_hashtags']
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    const updated = updateStylePack(update as Parameters<typeof updateStylePack>[0])
    return NextResponse.json({ stylePack: updated })
  } catch {
    return NextResponse.json({ error: 'Failed to update style pack' }, { status: 500 })
  }
}
