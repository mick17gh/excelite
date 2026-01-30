'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LLMProvider } from '@/lib/ai/types';

interface ProviderSelectorProps {
  value: LLMProvider | 'auto';
  onChange: (value: LLMProvider | 'auto') => void;
  disabled?: boolean;
}

const PROVIDER_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'gemini', label: 'Gemini' },
] as const;

export function ProviderSelector({
  value,
  onChange,
  disabled = false,
}: ProviderSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as LLMProvider | 'auto')}
      disabled={disabled}
    >
      <SelectTrigger className="w-[100px] h-7 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {PROVIDER_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
