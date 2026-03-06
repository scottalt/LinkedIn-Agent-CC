import { NextRequest, NextResponse } from 'next/server'
import { createPost, listPosts } from '@/lib/db/queries/posts'
import type { PostMode, PostStatus } from '@/lib/db/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status') as PostStatus | null
    const mode = searchParams.get('mode') as PostMode | null
    const limit = Number(searchParams.get('limit') ?? '50')
    const offset = Number(searchParams.get('offset') ?? '0')

    const posts = listPosts({ status: status ?? undefined, mode: mode ?? undefined, limit, offset })
    return NextResponse.json({ posts })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to list posts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { content, mode, post_type, template_id, first_comment } = body as {
      content: string
      mode?: PostMode
      post_type?: 'text' | 'image'
      template_id?: string
      first_comment?: string
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'content required' }, { status: 400 })
    }

    const post = createPost({ content, mode, post_type, template_id, first_comment })
    return NextResponse.json({ post }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
