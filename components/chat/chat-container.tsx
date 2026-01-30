'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { ProviderSelector } from './provider-selector';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import type { LLMProvider } from '@/lib/ai/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
  latencyMs?: number;
  cached?: boolean;
}

interface ChatContainerProps {
  initialProvider?: LLMProvider | 'auto';
  className?: string;
  onClose?: () => void;
  minimizable?: boolean;
}

export function ChatContainer({
  initialProvider = 'auto',
  className = '',
  onClose,
  minimizable = false,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [provider, setProvider] = useState<LLMProvider | 'auto'>(initialProvider);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setStreamingContent('');

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            sessionId: 'default',
            provider: provider === 'auto' ? undefined : provider,
            selectionMode: provider === 'auto' ? 'auto-balanced' : 'manual',
            previousMessages: messages.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send message');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let assistantContent = '';
        let metadata: {
          provider?: string;
          model?: string;
          latencyMs?: number;
          cached?: boolean;
        } = {};

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setStreamingContent(assistantContent);
              }
              if (data.done && data.metadata) {
                metadata = data.metadata;
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date(),
          provider: metadata.provider,
          model: metadata.model,
          latencyMs: metadata.latencyMs,
          cached: metadata.cached,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Chat error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, provider]
  );

  if (isMinimized) {
    return (
      <Card className={`w-72 ${className}`}>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">DineLytix AI</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(false)}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`flex flex-col h-[600px] max-h-[80vh] ${className}`}>
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">DineLytix AI Assistant</CardTitle>
        <div className="flex items-center gap-2">
          <ProviderSelector value={provider} onChange={setProvider} />
          {minimizable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-hidden p-0 flex flex-col">
        <ChatMessages
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
        />

        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </CardContent>
    </Card>
  );
}
