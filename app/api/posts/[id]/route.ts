import { NextRequest, NextResponse } from 'next/server'
import { getPostById, updatePost, deletePost, updatePostStatus } from '@/lib/db/queries/posts'
import type { PostStatus } from '@/lib/db/types'
import { v4 as uuidv4 } from 'uuid'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const post = getPostById(id)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ post })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const post = getPostById(id)
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const { status, ...rest } = body

    // Handle status transitions
    if (status === 'posted' && post.status !== 'posted') {
      const updated = updatePostStatus(id, 'posted', {
        posted_at: new Date().toISOString(),
        idempotency_key: uuidv4(),
        ...rest,
      })
      return NextResponse.json({ post: updated })
    }

    const updated = updatePost(id, { status, ...rest })
    return NextResponse.json({ post: updated })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const post = getPostById(id)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  deletePost(id)
  return NextResponse.json({ ok: true })
}
