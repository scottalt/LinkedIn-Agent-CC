import { StylePack } from '@/lib/db/types'

export type GuardrailStatus = 'pass' | 'warn' | 'fail'

export interface GuardrailResult {
  status: GuardrailStatus
  violations: string[]
}

// Patterns that are incompatible with Scott's voice
const AI_TELL_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /—/, label: 'Em dash (use comma or period instead)' },
  { pattern: /\.{3}$/, label: 'Trailing ellipsis for fake tension' },
  { pattern: /in today'?s (world|landscape|digital|fast-paced)/i, label: 'AI tell: "in today\'s world"' },
  { pattern: /let'?s (dive in|connect|talk|explore|unpack)/i, label: 'AI tell: "let\'s dive in"' },
  { pattern: /it'?s worth noting/i, label: 'AI tell: "it\'s worth noting"' },
  { pattern: /at the end of the day/i, label: 'Cliché: "at the end of the day"' },
  { pattern: /it goes without saying/i, label: 'Cliché: "it goes without saying"' },
  { pattern: /needless to say/i, label: 'Cliché: "needless to say"' },
  { pattern: /as we all know/i, label: 'Cliché: "as we all know"' },
  { pattern: /with that (being )?said/i, label: 'Cliché: "with that said"' },
  { pattern: /thrilled? to (share|announce)/i, label: 'AI tell: "thrilled to share"' },
  { pattern: /excited to (share|announce)/i, label: 'AI tell: "excited to share"' },
  { pattern: /honored to/i, label: 'AI tell: "honored to"' },
  { pattern: /humbled (to|by)/i, label: 'AI tell: "humbled"' },
  { pattern: /follow (me|for more)/i, label: 'Fake engagement: "follow me"' },
  { pattern: /dm me/i, label: 'Fake engagement: "DM me"' },
  { pattern: /like if you agree/i, label: 'Fake engagement: "like if you agree"' },
  { pattern: /repost if/i, label: 'Fake engagement: "repost if"' },
  { pattern: /comment below/i, label: 'Fake engagement: "comment below"' },
  { pattern: /drop a (like|comment)/i, label: 'Fake engagement: "drop a like/comment"' },
  { pattern: /^I /m, label: 'Opens a line with "I" — find a stronger entry point' },
  { pattern: /\!/, label: 'Exclamation point — remove it' },
  { pattern: /game.?changer/i, label: 'Banned: "game-changer"' },
  { pattern: /thought leadership/i, label: 'Banned: "thought leadership"' },
  { pattern: /paradigm shift/i, label: 'Banned: "paradigm shift"' },
  { pattern: /moving the needle/i, label: 'Banned: "moving the needle"' },
  { pattern: /low.?hanging fruit/i, label: 'Banned: "low-hanging fruit"' },
  { pattern: /in this post/i, label: 'Meta-reference: "in this post"' },
  { pattern: /today I (want to|am going to|will)/i, label: 'Weak opener: "Today I want to..."' },
]

export function checkGuardrails(text: string, stylePack: StylePack): GuardrailResult {
  const violations: string[] = []
  const bannedPhrases: string[] = JSON.parse(stylePack.banned_phrases)
  const hashtagRules: { min: number; max: number } = JSON.parse(stylePack.hashtag_rules)

  // Check banned phrases from style pack
  for (const phrase of bannedPhrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'i')
    if (regex.test(text)) {
      violations.push(`Banned phrase: "${phrase}"`)
    }
  }

  // Check AI tell patterns
  for (const { pattern, label } of AI_TELL_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(label)
    }
  }

  // Check hashtag count
  const hashtags = text.match(/#\w+/g) ?? []
  if (hashtags.length > hashtagRules.max) {
    violations.push(`Too many hashtags: ${hashtags.length} (max ${hashtagRules.max})`)
  }

  // Check line length — flag lines significantly over target
  const lines = text.split('\n').filter((l) => l.trim().length > 0 && !l.trim().startsWith('#'))
  const target = stylePack.line_length_target
  const longLines = lines.filter((l) => {
    const words = l.trim().split(/\s+/)
    return words.length > target * 2
  })
  if (longLines.length > 0) {
    violations.push(`${longLines.length} line(s) too long (target: ${target} words per line)`)
  }

  // Deduplicate (banned phrases list and AI tell patterns can overlap)
  const unique = Array.from(new Set(violations))

  const status: GuardrailStatus =
    unique.length === 0 ? 'pass' : unique.length <= 2 ? 'warn' : 'fail'

  return { status, violations: unique }
}
