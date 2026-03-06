import { StylePack } from '@/lib/db/types'

export type GuardrailStatus = 'pass' | 'warn' | 'fail'

export interface GuardrailResult {
  status: GuardrailStatus
  violations: string[]
}

const AI_TELL_PATTERNS = [
  /in today'?s (world|landscape|digital|fast)/i,
  /let'?s (dive in|connect|talk|explore)/i,
  /it'?s worth noting/i,
  /at the end of the day/i,
  /it goes without saying/i,
  /exciting (opportunity|time|news)/i,
  /thrilled? to (share|announce)/i,
  /delighted? to/i,
  /honored? to/i,
  /humbled? (to|by)/i,
  /—/, // em dash
  /\.{3}$/, // trailing ellipsis
]

export function checkGuardrails(text: string, stylePack: StylePack): GuardrailResult {
  const violations: string[] = []
  const bannedPhrases: string[] = JSON.parse(stylePack.banned_phrases)
  const hashtagRules: { min: number; max: number } = JSON.parse(stylePack.hashtag_rules)

  // Check banned phrases
  for (const phrase of bannedPhrases) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    if (regex.test(text)) {
      violations.push(`Banned phrase: "${phrase}"`)
    }
  }

  // Check AI tell patterns
  for (const pattern of AI_TELL_PATTERNS) {
    if (pattern.test(text)) {
      const match = text.match(pattern)?.[0]
      violations.push(`AI tell pattern: "${match}"`)
    }
  }

  // Check hashtag count
  const hashtags = text.match(/#\w+/g) ?? []
  if (hashtags.length > hashtagRules.max) {
    violations.push(`Too many hashtags: ${hashtags.length} (max ${hashtagRules.max})`)
  }

  // Check line length
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  const longLines = lines.filter((l) => {
    const words = l.trim().split(/\s+/).filter((w) => !w.startsWith('#'))
    return words.length > stylePack.line_length_target * 1.5
  })
  if (longLines.length > 0) {
    violations.push(`${longLines.length} line(s) exceed target length`)
  }

  const status: GuardrailStatus =
    violations.length === 0 ? 'pass' : violations.length <= 2 ? 'warn' : 'fail'

  return { status, violations }
}
