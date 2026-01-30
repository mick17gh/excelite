'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { ChatContainer } from './chat-container';
import { cn } from '@/lib/utils';

interface FloatingChatWidgetProps {
  defaultOpen?: boolean;
}

export function FloatingChatWidget({ defaultOpen = false }: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const toggleChat = () => {
    setIsAnimating(true);
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setHasUnread(false);
    }
  };

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out origin-bottom-right',
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        )}
      >
        <ChatContainer
          className="w-[380px] md:w-[420px] shadow-2xl border"
          onClose={() => setIsOpen(false)}
          minimizable
        />
      </div>

      {/* Toggle Button */}
      <Button
        onClick={toggleChat}
        size="lg"
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110',
          isOpen
            ? 'bg-muted text-muted-foreground hover:bg-muted/80'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        <div className="relative">
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <MessageCircle className="h-6 w-6" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive animate-pulse" />
              )}
            </>
          )}
        </div>
      </Button>
    </div>
  );
}
