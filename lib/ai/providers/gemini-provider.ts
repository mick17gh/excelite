import { BaseLLMProvider, PROVIDER_CONFIGS } from './base-provider';
import type {
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../types';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiProvider extends BaseLLMProvider {
  readonly name = 'gemini' as const;
  readonly config: LLMProviderConfig;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
    super();
    this.apiKey = apiKey;
    const configKey = `gemini:${model}`;
    const baseConfig = PROVIDER_CONFIGS[configKey] || PROVIDER_CONFIGS['gemini:gemini-1.5-flash'];
    this.config = { ...baseConfig, apiKey };
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const { systemInstruction, contents } = this.buildGeminiMessages(request);

    const response = await fetch(
      `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          contents,
          generationConfig: {
            maxOutputTokens: request.maxTokens ?? this.getDefaultMaxTokens(),
            temperature: this.getDefaultTemperature(request),
            topP: request.topP ?? 1,
            responseMimeType: request.responseFormat === 'json' ? 'application/json' : 'text/plain',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data: GeminiResponse = await response.json();
    const latencyMs = Date.now() - startTime;

    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

    return {
      content: data.candidates[0]?.content?.parts[0]?.text || '',
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: data.usageMetadata?.totalTokenCount || inputTokens + outputTokens,
        cost: this.estimateCost(inputTokens, outputTokens),
      },
      provider: this.name,
      model: this.config.model,
      latencyMs,
      cached: false,
    };
  }

  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const { systemInstruction, contents } = this.buildGeminiMessages(request);

    const response = await fetch(
      `${this.baseUrl}/models/${this.config.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          contents,
          generationConfig: {
            maxOutputTokens: request.maxTokens ?? this.getDefaultMaxTokens(),
            temperature: this.getDefaultTemperature(request),
            topP: request.topP ?? 1,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
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
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            const finishReason = json.candidates?.[0]?.finishReason;

            if (text) {
              yield { content: text, done: false };
            }

            if (finishReason === 'STOP') {
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

  private buildGeminiMessages(request: LLMRequest): {
    systemInstruction: string | null;
    contents: GeminiContent[];
  } {
    let systemInstruction: string | null = null;
    const contents: GeminiContent[] = [];

    if (request.systemPrompt) {
      systemInstruction = request.systemPrompt;
    }

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemInstruction = systemInstruction
          ? `${systemInstruction}\n\n${msg.content}`
          : msg.content;
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    return { systemInstruction, contents };
  }
}
