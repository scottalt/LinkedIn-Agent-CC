import Anthropic from '@anthropic-ai/sdk'
import { LLMProvider, Message, GenerateOptions } from './types'

export class AnthropicProvider implements LLMProvider {
  provider = 'anthropic' as const
  model: string
  private client: Anthropic

  constructor(apiKey: string, model = 'claude-opus-4-6') {
    this.model = model
    this.client = new Anthropic({ apiKey })
  }

  async generate(messages: Message[], options: GenerateOptions = {}): Promise<string> {
    const { temperature = 0.7, maxTokens = 2000 } = options

    const systemMsg = messages.find((m) => m.role === 'system')
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    const response = await this.client.messages.create({
      model: this.model,
      system: systemMsg?.content,
      messages: chatMessages,
      temperature,
      max_tokens: maxTokens,
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    return textBlock?.type === 'text' ? textBlock.text : ''
  }
}
