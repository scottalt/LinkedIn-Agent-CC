import { getAllSettings } from '@/lib/db/queries/settings'
import { LLMProvider } from './types'
import { OpenAIProvider } from './openai-provider'
import { AnthropicProvider } from './anthropic-provider'

export function getProvider(): LLMProvider {
  const settings = getAllSettings()
  const provider = settings.llm_provider ?? 'openai'
  const model = settings.llm_model ?? 'gpt-4o'

  if (provider === 'anthropic') {
    const key = settings.anthropic_api_key || process.env.ANTHROPIC_API_KEY || ''
    return new AnthropicProvider(key, model)
  }

  const key = settings.openai_api_key || process.env.OPENAI_API_KEY || ''
  return new OpenAIProvider(key, model)
}

export type { LLMProvider, Message, GenerateOptions } from './types'
