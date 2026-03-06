export type PostStatus = 'draft' | 'approved' | 'scheduled' | 'draft_saved' | 'posted' | 'failed'
export type PostType = 'text' | 'image'
export type PostMode = 'engagement' | 'authority'
export type CloserType = 'question' | 'soft_cta' | 'dm_advice' | 'none'
export type HookType = 'question' | 'stat' | 'story' | 'contrarian' | 'list' | 'none'
export type ModeAffinity = 'engagement' | 'authority' | 'both'

export interface Post {
  id: string
  content: string
  first_comment: string | null
  mode: PostMode | null
  status: PostStatus
  post_type: PostType
  image_path: string | null
  scheduled_at: string | null
  posted_at: string | null
  created_at: string
  updated_at: string
  template_id: string | null
  idempotency_key: string | null
  impressions: number
  likes: number
  comments: number
  reposts: number
  saves: number
  engagement_score: number
  authority_score: number
  authority_override: number
}

export interface Template {
  id: string
  name: string
  hook_type: HookType | null
  structure: string // JSON string
  closer_type: CloserType | null
  mode_affinity: ModeAffinity | null
  avg_engagement_score: number
  avg_authority_score: number
  use_count: number
  created_at: string
  is_seed: number
}

export interface StylePack {
  id: string
  version: number
  banned_phrases: string // JSON array
  hashtag_rules: string // JSON object
  line_length_target: number
  max_hashtags: number
  formatting_rules: string // JSON object
  voice_examples: string // JSON array
  updated_at: string
}

export interface AnalyticsSnapshot {
  id: string
  post_id: string
  captured_at: string
  impressions: number | null
  likes: number | null
  comments: number | null
  reposts: number | null
  saves: number | null
  engagement_score: number | null
  authority_score: number | null
  source: 'manual' | 'playwright'
}

export interface IngestSession {
  id: string
  created_at: string
  raw_input: string
  extracted_patterns: string | null // JSON
  posts_parsed: number | null
  committed: number
}

export interface Setting {
  key: string
  value: string
}
