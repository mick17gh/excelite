"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PinInputProps = {
  value: string;
  onChange: (pin: string) => void;
  idPrefix?: string;
  disabled?: boolean;
  className?: string;
};

export function PinInput({
  value,
  onChange,
  idPrefix = "pin",
  disabled = false,
  className,
}: PinInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 4 }, (_, idx) => value[idx] || "");

  const setAt = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(""));
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setAt(index, digit);
    if (digit && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    onChange(Array.from({ length: 4 }, (_, idx) => pasted[idx] || "").join(""));
    const focusIndex = Math.min(pasted.length, 4) - 1;
    if (focusIndex >= 0) {
      refs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {digits.map((digit, index) => (
        <Input
          key={`${idPrefix}-${index}`}
          id={index === 0 ? idPrefix : undefined}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="h-10 w-10 text-center text-base tracking-widest"
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          maxLength={1}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
