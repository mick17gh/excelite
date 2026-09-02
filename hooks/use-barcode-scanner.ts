"use client";

import { useCallback, useEffect, useRef } from "react";

const SCAN_GAP_MS = 50;
const DUPLICATE_SCAN_MS = 300;

interface UseBarcodeScannerOptions {
  enabled: boolean;
  onScan: (value: string) => void;
}

export function useBarcodeScanner({ enabled, onScan }: UseBarcodeScannerOptions) {
  const bufferRef = useRef("");
  const lastKeyAtRef = useRef(0);
  const lastScanAtRef = useRef(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const resetBuffer = useCallback(() => {
    bufferRef.current = "";
    lastKeyAtRef.current = 0;
  }, []);

  const flushBuffer = useCallback(() => {
    const value = bufferRef.current.trim();
    resetBuffer();
    if (!value) return;

    const now = Date.now();
    if (now - lastScanAtRef.current < DUPLICATE_SCAN_MS) return;
    lastScanAtRef.current = now;
    onScanRef.current(value);
  }, [resetBuffer]);

  useEffect(() => {
    if (!enabled) {
      resetBuffer();
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        target?.isContentEditable ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";

      if (isEditable && !target?.dataset.barcodeCapture) {
        return;
      }

      const now = Date.now();
      if (lastKeyAtRef.current && now - lastKeyAtRef.current > SCAN_GAP_MS) {
        bufferRef.current = "";
      }
      lastKeyAtRef.current = now;

      if (event.key === "Enter") {
        if (bufferRef.current) {
          event.preventDefault();
          flushBuffer();
        }
        return;
      }

      if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      bufferRef.current += event.key;
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      resetBuffer();
    };
  }, [enabled, flushBuffer, resetBuffer]);

  return { resetBuffer };
}
