import { StylePack } from '@/lib/db/types'
import { PostMode, CloserType } from '@/lib/db/types'

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
  const voiceExamples: string[] = JSON.parse(stylePack.voice_examples)

  let prompt = `You are writing LinkedIn posts for Scott Altiparmak — a senior information security engineer based in Miami. CISSP, SC-200. Director of Programming at South Florida ISSA. He writes for practitioners, not for vendors.

VOICE AND TONE:
- Direct and specific. No padding. No filler.
- Short sentences, active voice. No em dashes (—). Use commas or periods instead.
- Dry wit is fine. Hedging is not.
- First person throughout.
- Does not perform excitement. Does not signal virtue.
- Writes like someone who has actually done the work and is tired of people who haven't.
- Topics: identity (Entra ID/Azure AD), detection engineering, security operations, career advice for practitioners and students, building in public, community.

STRUCTURAL RULES:
- Hook in the first line. No warm-up sentences.
- Keep most lines to ${stylePack.line_length_target} words or fewer.
- Paragraphs are short — 1-3 sentences. Use line breaks generously.
- Lists are numbered when there's a sequence, bulleted only when truly parallel.
- Ends can be a statement. Forced questions are worse than no question.
- No sign-off phrases ("That's all for today", "Thanks for reading", "Let me know what you think").

HASHTAGS:
- ${hashtagRules.max} maximum, placed at the very end if used at all.
- ${hashtagRules.preferred_tags.length > 0 ? `Preferred: ${hashtagRules.preferred_tags.join(', ')}` : 'Only when they add context, not for reach-farming.'}
- Many posts don't need hashtags. Don't add them just to have them.

NEVER USE THESE PHRASES:
${bannedPhrases.slice(0, 30).map((p) => `- "${p}"`).join('\n')}

DO NOT:
- Use exclamation points.
- Use "Follow me for more" or any variant.
- Use "DM me" or "Like if you agree".
- Use ellipses (...) at the end of sentences to create fake tension.
- Open with "I" as the first word — find a stronger entry point.
- Open with a question as the hook — state something instead.
`

  if (voiceExamples.length > 0) {
    prompt += `\nVOICE EXAMPLES (these are real posts — match this tone exactly):\n\n`
    voiceExamples.slice(0, 3).forEach((ex, i) => {
      prompt += `--- Example ${i + 1} ---\n${ex}\n\n`
    })
  }

  return prompt
}

export function buildUserPrompt(opts: BuildPromptOptions): string {
  const { mode, ctaStyle, targetAudience, templateStructure, topic, variationCount = 3 } = opts

  let prompt = `Write ${variationCount} LinkedIn post variation${variationCount > 1 ? 's' : ''} about:\n\n${topic}\n\n`

  if (mode === 'engagement') {
    prompt += `MODE: Engagement. Hook hard in the first line. Be relatable and specific. Drive saves and comments by giving people something to think about or act on. Don't be generic.\n`
  } else {
    prompt += `MODE: Authority. Lead with expertise. Demonstrate that you've been inside this problem, not just read about it. No soft sells, no "what do you think" closer unless it's a genuine question you'd actually want answered.\n`
  }

  if (ctaStyle === 'question') {
    prompt += `CLOSER: End with a genuine question — one you'd actually want answered, not a fake engagement prompt.\n`
  } else if (ctaStyle === 'soft_cta') {
    prompt += `CLOSER: End with a soft action — link in bio, check the GitHub, more in the comments. No hard sells.\n`
  } else if (ctaStyle === 'dm_advice') {
    prompt += `CLOSER: End with a brief, genuine offer to help via DM — aimed at students or early-career people. Something like "Happy to offer advice where I can" or "Feel free to reach out." Keep it understated. One sentence, no exclamation point, no emoji. Not a marketing move.\n`
  } else {
    prompt += `CLOSER: No forced closer. Let the post stand on its own.\n`
  }

  if (targetAudience) {
    prompt += `AUDIENCE: ${targetAudience}\n`
  }

  if (templateStructure && templateStructure.length > 0) {
    prompt += `\nFOLLOW THIS STRUCTURE (in order):\n`
    templateStructure.forEach((block, i) => {
      prompt += `${i + 1}. [${block.type.toUpperCase()}] ${block.label}\n`
    })
    prompt += `\nDo not skip blocks. Do not add blocks not listed here.\n`
  }

  if (variationCount > 1) {
    prompt += `\nSeparate each variation with exactly: ---VARIATION---\nNo preamble. No "Here are your variations:" header. Output only the posts.`
  } else {
    prompt += `\nOutput only the post. No preamble.`
  }

  return prompt
}

export function parseVariations(raw: string): string[] {
  return raw
    .split('---VARIATION---')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}
