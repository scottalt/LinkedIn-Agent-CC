import { LLMProvider, Message } from '@/lib/llm/types'

export async function tightenPost(content: string, provider: LLMProvider): Promise<string> {
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are an editor who tightens LinkedIn posts. Cut ~20% of words without losing meaning or changing the author's voice. Increase punch and directness. Never add words. Output only the tightened post, no commentary. Never use em dashes (—).`,
    },
    {
      role: 'user',
      content: `Tighten this post:\n\n${content}`,
    },
  ]

  return provider.generate(messages, { temperature: 0.3, maxTokens: 1000 })
}
