import { LLMProvider, Message } from '@/lib/llm/types'

export async function tightenPost(content: string, provider: LLMProvider): Promise<string> {
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are editing LinkedIn posts for Scott Altiparmak — a senior security engineer who writes for practitioners.

Your job: cut ~20% of words without changing meaning, tone, or voice.

Rules:
- Remove filler words and throat-clearing ("I think", "It's important to note", "Basically")
- Tighten passive constructions to active voice
- Break long sentences into two short ones
- Never add words — only cut or rearrange
- Never use em dashes (—) — use commas or periods
- Never add exclamation points
- Never add hashtags the original didn't have
- Do not change the structure or reorder sections
- Output only the edited post. No commentary, no "Here is the tightened version:".`,
    },
    {
      role: 'user',
      content: `Tighten this post:\n\n${content}`,
    },
  ]

  return provider.generate(messages, { temperature: 0.2, maxTokens: 1200 })
}
