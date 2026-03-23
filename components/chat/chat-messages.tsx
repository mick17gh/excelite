'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './chat-message';
import { Loader2 } from 'lucide-react';

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

interface ChatMessagesProps {
  messages: Message[];
  streamingContent: string;
  isLoading: boolean;
}

export function ChatMessages({
  messages,
  streamingContent,
  isLoading,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground max-w-sm">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="font-medium mb-2">ServStack AI Assistant</h3>
          <p className="text-sm">
            Ask about sales, branch vs warehouse stock, orders, reports exports, staff, or KPIs.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[
              "Today's sales",
              'Warehouse transfers this month',
              'Orders by status',
              'What reports can I export?',
            ].map((suggestion) => (
              <span
                key={suggestion}
                className="text-xs bg-muted px-2 py-1 rounded-full"
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1 h-full overflow-auto">
      <div className="space-y-4 p-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {streamingContent && (
          <ChatMessage
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              timestamp: new Date(),
            }}
            isStreaming
          />
        )}

        {isLoading && !streamingContent && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
