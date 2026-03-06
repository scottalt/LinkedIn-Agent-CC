import { NextRequest, NextResponse } from 'next/server'
import { listTemplates, createTemplate } from '@/lib/db/queries/templates'
import type { ModeAffinity, HookType, CloserType } from '@/lib/db/types'

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode') as ModeAffinity | null
  const templates = listTemplates(mode ?? undefined)
  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, hook_type, structure, closer_type, mode_affinity } = body as {
      name: string
      hook_type?: HookType
      structure: { type: string; label: string }[]
      closer_type?: CloserType
      mode_affinity?: ModeAffinity
    }

    if (!name?.trim() || !Array.isArray(structure)) {
      return NextResponse.json({ error: 'name and structure required' }, { status: 400 })
    }

    const template = createTemplate({ name, hook_type, structure, closer_type, mode_affinity })
    return NextResponse.json({ template }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
