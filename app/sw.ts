/// <reference types="@serwist/next/typings" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Next may emit optional RSC boundary chunks in the manifest that 404 at runtime. */
function filterPrecacheEntries(
  entries: (PrecacheEntry | string)[] | undefined,
): (PrecacheEntry | string)[] {
  if (!entries?.length) return [];
  return entries.filter((entry) => {
    const url = typeof entry === "string" ? entry : entry.url;
    return !url.includes("/_next/static/chunks/next/dist/client/components/builtin/");
  });
}

const serwist = new Serwist({
  precacheEntries: filterPrecacheEntries(self.__SW_MANIFEST),
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
