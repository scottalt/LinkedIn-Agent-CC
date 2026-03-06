import { StylePack } from '@/lib/db/types'
import { PostMode, CloserType, HookType } from '@/lib/db/types'

interface BuildPromptOptions {
  stylePack: StylePack
  mode: PostMode
  ctaStyle?: CloserType
  targetAudience?: string
  templateStructure?: { type: string; label: string }[]
  topic: string
  variationCount?: number
}

export function buildSystemPrompt(stylePack: StylePack): string {
  const bannedPhrases: string[] = JSON.parse(stylePack.banned_phrases)
  const hashtagRules: { min: number; max: number; preferred_tags: string[] } = JSON.parse(
    stylePack.hashtag_rules
  )
  const formattingRules: Record<string, boolean> = JSON.parse(stylePack.formatting_rules)
  const voiceExamples: string[] = JSON.parse(stylePack.voice_examples)

  const rules: string[] = [
    `Write in first person. Be direct and specific. No vendor language.`,
    `Max line length: ${stylePack.line_length_target} words. Short sentences. Active voice.`,
    `Hashtags: ${hashtagRules.min}-${hashtagRules.max} max. ${hashtagRules.preferred_tags.length > 0 ? `Preferred: ${hashtagRules.preferred_tags.join(', ')}` : 'Use sparingly.'}`,
    formattingRules.no_em_dash ? 'Never use em dashes (—). Use commas or periods instead.' : '',
    `BANNED PHRASES (never use): ${bannedPhrases.join(', ')}`,
    `Do not use AI tell phrases like "in today's landscape", "it's worth noting", "let's dive in", "at the end of the day", "it goes without saying".`,
  ].filter(Boolean)

  let prompt = `You are a LinkedIn content writer for a senior information security professional.\n\n`
  prompt += `RULES:\n${rules.map((r) => `- ${r}`).join('\n')}\n\n`

  if (voiceExamples.length > 0) {
    prompt += `VOICE EXAMPLES (match this tone and style):\n`
    voiceExamples.slice(0, 3).forEach((ex, i) => {
      prompt += `Example ${i + 1}:\n${ex}\n\n`
    })
  }

  return prompt
}

export function buildUserPrompt(opts: BuildPromptOptions): string {
  const { mode, ctaStyle, targetAudience, templateStructure, topic, variationCount = 3 } = opts

  let prompt = `Write ${variationCount} LinkedIn post variations about:\n\n${topic}\n\n`

  prompt += `MODE: ${mode === 'engagement' ? 'Engagement (hooks, relatable, drives comments/saves)' : 'Authority (expertise-first, demonstrates deep knowledge, no soft sells)'}\n`

  if (ctaStyle && ctaStyle !== 'none') {
    prompt += `CLOSER: ${ctaStyle === 'question' ? 'End with a genuine question for the audience' : 'End with a soft CTA (no hard sells, no "follow me" or "DM me")'}\n`
  } else if (ctaStyle === 'none') {
    prompt += `CLOSER: No call to action. Let the post stand on its own.\n`
  }

  if (targetAudience) {
    prompt += `AUDIENCE: ${targetAudience}\n`
  }

  if (templateStructure && templateStructure.length > 0) {
    prompt += `\nSTRUCTURE (follow this order):\n`
    templateStructure.forEach((block, i) => {
      prompt += `${i + 1}. [${block.type.toUpperCase()}] ${block.label}\n`
    })
  }

  prompt += `\nFormat: Separate each variation with "---VARIATION---". No preamble. Output only the posts.`

  return prompt
}

export function parseVariations(raw: string): string[] {
  return raw
    .split('---VARIATION---')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}
