import { BaseLLMProvider, PROVIDER_CONFIGS } from './base-provider';
import type {
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../types';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class DeepSeekProvider extends BaseLLMProvider {
  readonly name = 'deepseek' as const;
  readonly config: LLMProviderConfig;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.deepseek.com/v1';

  constructor(apiKey: string, model: string = 'deepseek-chat') {
    super();
    this.apiKey = apiKey;
    const configKey = `deepseek:${model}`;
    const baseConfig = PROVIDER_CONFIGS[configKey] || PROVIDER_CONFIGS['deepseek:deepseek-chat'];
    this.config = { ...baseConfig, apiKey };
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request) as DeepSeekMessage[];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: request.maxTokens ?? this.getDefaultMaxTokens(),
        temperature: this.getDefaultTemperature(request),
        top_p: request.topP ?? 1,
        response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }

    const data: DeepSeekResponse = await response.json();
    const latencyMs = Date.now() - startTime;

    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;

    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: data.usage.total_tokens,
        cost: this.estimateCost(inputTokens, outputTokens),
      },
      provider: this.name,
      model: this.config.model,
      latencyMs,
      cached: false,
    };
  }

  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const messages = this.buildMessages(request) as DeepSeekMessage[];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: request.maxTokens ?? this.getDefaultMaxTokens(),
        temperature: this.getDefaultTemperature(request),
        top_p: request.topP ?? 1,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices[0]?.delta?.content;
            const finishReason = json.choices[0]?.finish_reason;

            if (content) {
              yield { content, done: false };
            }

            if (finishReason === 'stop') {
              yield { content: '', done: true };
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
