import { NextRequest, NextResponse } from 'next/server'
import { getTemplateById, updateTemplate, deleteTemplate } from '@/lib/db/queries/templates'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const template = getTemplateById(id)
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ template })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const updated = updateTemplate(id, body)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ template: updated })
  } catch {
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const template = getTemplateById(id)
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (template.is_seed) return NextResponse.json({ error: 'Cannot delete seed template' }, { status: 400 })
  deleteTemplate(id)
  return NextResponse.json({ ok: true })
}
