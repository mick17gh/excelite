"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/contexts/currency-context";
import { PwaProvider } from "@/components/pwa-provider";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <PwaProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <CurrencyProvider>
          {children}
          <Toaster richColors position="top-right" />
        </CurrencyProvider>
      </ThemeProvider>
    </PwaProvider>
  );
}
