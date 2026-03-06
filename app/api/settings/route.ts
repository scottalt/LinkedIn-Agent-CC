import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, setSetting } from '@/lib/db/queries/settings'

export async function GET() {
  const settings = getAllSettings()
  // Mask API keys in response
  const safe = { ...settings }
  if (safe.openai_api_key) safe.openai_api_key = safe.openai_api_key ? '***' : ''
  if (safe.anthropic_api_key) safe.anthropic_api_key = safe.anthropic_api_key ? '***' : ''
  return NextResponse.json({ settings: safe })
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string>
    const allowed = [
      'llm_provider', 'llm_model', 'openai_api_key', 'anthropic_api_key',
      'playwright_enabled', 'engagement_weights',
      'mix_target_engagement', 'mix_target_authority', 'posting_time_windows',
    ]
    for (const [key, value] of Object.entries(body)) {
      if (allowed.includes(key) && typeof value === 'string') {
        // Don't overwrite keys if masked value sent back
        if (value === '***') continue
        setSetting(key, value)
      }
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
