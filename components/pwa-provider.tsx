"use client";

import { SerwistProvider } from "@serwist/next/react";
import { useEffect, type ReactNode } from "react";

const isDev = process.env.NODE_ENV === "development";

export function PwaProvider({ children }: { children: ReactNode }) {
  // Remove stale production SW from the browser during local dev (causes 404 precache + auth glitches).
  useEffect(() => {
    if (!isDev || typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });
    }

    if ("caches" in window) {
      void caches.keys().then((keys) => {
        keys.forEach((key) => void caches.delete(key));
      });
    }
  }, []);

  return (
    <SerwistProvider swUrl="/sw.js" disable={isDev} register={!isDev}>
      {children}
    </SerwistProvider>
  );
}
