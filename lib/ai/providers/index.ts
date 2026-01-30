import { OpenAIProvider } from './openai-provider';
import { DeepSeekProvider } from './deepseek-provider';
import { GeminiProvider } from './gemini-provider';
import { BaseLLMProvider, ProviderChoice } from './base-provider';
import type { LLMProvider, ClassifiedQuery, SelectionMode } from '../types';

const FAILOVER_CHAIN: Record<LLMProvider, LLMProvider[]> = {
  openai: ['deepseek', 'gemini'],
  deepseek: ['gemini', 'openai'],
  gemini: ['openai', 'deepseek'],
};

class LLMProviderFactory {
  private providers: Map<string, BaseLLMProvider> = new Map();

  getProvider(provider: LLMProvider, model?: string): BaseLLMProvider {
    const openaiKey = process.env.OPENAI_API_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const geminiKey = process.env.GOOGLE_AI_API_KEY;

    const cacheKey = `${provider}:${model || 'default'}`;

    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    let instance: BaseLLMProvider;

    switch (provider) {
      case 'openai':
        if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');
        instance = new OpenAIProvider(openaiKey, model || 'gpt-4o-mini');
        break;
      case 'deepseek':
        if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY not configured');
        instance = new DeepSeekProvider(deepseekKey, model || 'deepseek-chat');
        break;
      case 'gemini':
        if (!geminiKey) throw new Error('GOOGLE_AI_API_KEY not configured');
        instance = new GeminiProvider(geminiKey, model || 'gemini-1.5-flash');
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    this.providers.set(cacheKey, instance);
    return instance;
  }

  selectProvider(
    query: ClassifiedQuery,
    mode: SelectionMode = 'auto-balanced'
  ): ProviderChoice {
    if (mode === 'manual') {
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reason: 'Manual selection (default)',
      };
    }

    // Auto-selection based on query characteristics
    return this.autoSelectProvider(query, mode);
  }

  private autoSelectProvider(
    query: ClassifiedQuery,
    mode: SelectionMode
  ): ProviderChoice {
    const { intent, complexity } = query;

    // Tier 1: Classification & simple informational (cheapest)
    if (complexity === 'simple' && intent === 'informational') {
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reason: 'Simple query - using cost-effective model',
      };
    }

    // Tier 2: Data queries and operational (DeepSeek - good at structured)
    if (intent === 'operational' || complexity === 'simple') {
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        reason: 'Structured data query - DeepSeek optimal',
      };
    }

    // Tier 3: Analytical and comparative (need reasoning)
    if (intent === 'analytical' || intent === 'comparative') {
      if (mode === 'auto-cost') {
        return {
          provider: 'deepseek',
          model: 'deepseek-chat',
          reason: 'Cost-optimized analysis',
        };
      }
      return {
        provider: 'gemini',
        model: 'gemini-1.5-pro',
        reason: 'Complex analysis - Gemini Pro for quality',
      };
    }

    // Tier 4: Predictive and recommendation (need creativity + reasoning)
    if (intent === 'predictive' || intent === 'recommendation') {
      if (mode === 'auto-cost') {
        return {
          provider: 'deepseek',
          model: 'deepseek-chat',
          reason: 'Cost-optimized recommendation',
        };
      }
      return {
        provider: 'gemini',
        model: 'gemini-1.5-pro',
        reason: 'Recommendation generation - using Gemini Pro',
      };
    }

    // Default: balanced choice
    return {
      provider: 'deepseek',
      model: 'deepseek-chat',
      reason: 'Default balanced selection',
    };
  }

  getFailoverChain(provider: LLMProvider): LLMProvider[] {
    return FAILOVER_CHAIN[provider] || [];
  }

  async executeWithFailover<T>(
    primaryProvider: LLMProvider,
    operation: (provider: BaseLLMProvider) => Promise<T>
  ): Promise<{ result: T; usedProvider: LLMProvider }> {
    const chain = [primaryProvider, ...this.getFailoverChain(primaryProvider)];
    const errors: Error[] = [];

    for (const providerName of chain) {
      try {
        const provider = this.getProvider(providerName);
        const result = await operation(provider);
        return { result, usedProvider: providerName };
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
        console.error(`Provider ${providerName} failed:`, error);

        if (providerName === chain[chain.length - 1]) {
          throw new Error(
            `All providers failed. Errors: ${errors.map((e) => e.message).join('; ')}`
          );
        }
      }
    }

    throw new Error('No providers available');
  }
}

export const providerFactory = new LLMProviderFactory();

export { OpenAIProvider } from './openai-provider';
export { DeepSeekProvider } from './deepseek-provider';
export { GeminiProvider } from './gemini-provider';
export { BaseLLMProvider, PROVIDER_CONFIGS } from './base-provider';
export type { ProviderChoice } from './base-provider';
