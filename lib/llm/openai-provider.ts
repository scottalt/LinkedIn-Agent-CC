import OpenAI from 'openai'
import { LLMProvider, Message, GenerateOptions } from './types'

export class OpenAIProvider implements LLMProvider {
  provider = 'openai' as const
  model: string
  private client: OpenAI

  constructor(apiKey: string, model = 'gpt-4o') {
    this.model = model
    this.client = new OpenAI({ apiKey })
  }

  async generate(messages: Message[], options: GenerateOptions = {}): Promise<string> {
    const { temperature = 0.7, maxTokens = 2000 } = options

    const chatMessages = messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }))

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: chatMessages,
      temperature,
      max_tokens: maxTokens,
    })

    return response.choices[0]?.message?.content ?? ''
  }
}
