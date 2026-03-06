import { NextRequest, NextResponse } from 'next/server'
import { saveSnapshot, getSnapshotsForPost } from '@/lib/db/queries/analytics'
import { listPosts } from '@/lib/db/queries/posts'

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get('postId')
  if (postId) {
    const snapshots = getSnapshotsForPost(postId)
    return NextResponse.json({ snapshots })
  }
  // Return all posted posts with their latest metrics
  const posts = listPosts({ status: 'posted', limit: 100 })
  return NextResponse.json({ posts })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { post_id, impressions, likes, comments, reposts, saves, source = 'manual' } = body as {
      post_id: string
      impressions: number
      likes: number
      comments: number
      reposts: number
      saves: number
      source?: 'manual' | 'playwright'
    }

    if (!post_id) {
      return NextResponse.json({ error: 'post_id required' }, { status: 400 })
    }

    const snapshot = saveSnapshot({ post_id, impressions, likes, comments, reposts, saves, source })
    return NextResponse.json({ snapshot })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 })
  }
}
