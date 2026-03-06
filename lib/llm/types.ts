export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateOptions {
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface LLMProvider {
  provider: 'openai' | 'anthropic'
  model: string
  generate(messages: Message[], options?: GenerateOptions): Promise<string>
}
