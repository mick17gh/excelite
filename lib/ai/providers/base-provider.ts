import type {
  LLMProvider,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../types';

export abstract class BaseLLMProvider {
  abstract readonly name: LLMProvider;
  abstract readonly config: LLMProviderConfig;

  abstract complete(request: LLMRequest): Promise<LLMResponse>;

  abstract stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk, void, unknown>;

  abstract countTokens(text: string): number;

  estimateCost(inputTokens: number, outputTokens: number): number {
    return (
      (inputTokens / 1000) * this.config.costPer1kInput +
      (outputTokens / 1000) * this.config.costPer1kOutput
    );
  }

  protected buildMessages(request: LLMRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    messages.push(...request.messages);

    return messages;
  }

  protected getDefaultMaxTokens(): number {
    return Math.min(this.config.maxTokens, 4096);
  }

  protected getDefaultTemperature(request: LLMRequest): number {
    return request.temperature ?? 0.1;
  }
}

export interface ProviderChoice {
  provider: LLMProvider;
  model: string;
  reason: string;
}

export const PROVIDER_CONFIGS: Record<string, Omit<LLMProviderConfig, 'apiKey'>> = {
  'openai:gpt-4o-mini': {
    name: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 16384,
    contextWindow: 128000,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    supportsStreaming: true,
  },
  'openai:gpt-4o': {
    name: 'openai',
    model: 'gpt-4o',
    maxTokens: 16384,
    contextWindow: 128000,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
    supportsStreaming: true,
  },
  'deepseek:deepseek-chat': {
    name: 'deepseek',
    model: 'deepseek-chat',
    maxTokens: 8192,
    contextWindow: 64000,
    costPer1kInput: 0.00014,
    costPer1kOutput: 0.00028,
    supportsStreaming: true,
  },
  'gemini:gemini-1.5-flash': {
    name: 'gemini',
    model: 'gemini-1.5-flash',
    maxTokens: 8192,
    contextWindow: 1000000,
    costPer1kInput: 0.000075,
    costPer1kOutput: 0.0003,
    supportsStreaming: true,
  },
  'gemini:gemini-1.5-pro': {
    name: 'gemini',
    model: 'gemini-1.5-pro',
    maxTokens: 8192,
    contextWindow: 2000000,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    supportsStreaming: true,
  },
};
