"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import type { PublicStoreConfig } from "@/lib/storefront/config";
import { formatDisplayTime, getNextStoreOpen } from "@/lib/storefront/hours";
import { normalizeWhatsAppDigits } from "@/lib/storefront/whatsapp-order-message";

type Props = {
  config: PublicStoreConfig;
};

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

function splitCountdown(totalMs: number): CountdownParts {
  const clamped = Math.max(0, totalMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalMs: clamped };
}

function CountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[4.25rem] flex-col items-center rounded-2xl border border-[#001F5C]/8 bg-white/90 px-3 py-3 shadow-sm backdrop-blur sm:min-w-[5rem] sm:px-4 sm:py-4">
      <span className="font-mono text-2xl font-bold tabular-nums tracking-tight text-[#001F5C] sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function StorefrontClosed({ config }: Props) {
  const phone = config.contact.phone?.trim() || null;
  const whatsapp = config.contact.whatsapp?.trim() || null;
  const waDigits = whatsapp ? normalizeWhatsAppDigits(whatsapp) : "";
  const outsideHours = Boolean(config.status.enabled && !config.status.isOpenNow);

  const nextOpen = useMemo(
    () => (outsideHours ? getNextStoreOpen(config.hours.weekly, config.hours.timezone) : null),
    [outsideHours, config.hours.weekly, config.hours.timezone],
  );

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!nextOpen) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [nextOpen]);

  useEffect(() => {
    if (!nextOpen) return;
    if (nowMs < nextOpen.atMs) return;
    // Soft refresh once countdown hits zero so the open menu can load.
    const t = window.setTimeout(() => {
      window.location.reload();
    }, 800);
    return () => window.clearTimeout(t);
  }, [nextOpen, nowMs]);

  const countdown = nextOpen ? splitCountdown(nextOpen.atMs - nowMs) : null;
  const showDays = Boolean(countdown && countdown.days > 0);

  const headline = outsideHours
    ? nextOpen?.isToday
      ? "We're closed right now"
      : "We're closed today"
    : "Online ordering is paused";

  const supporting =
    outsideHours && nextOpen
      ? nextOpen.label
      : config.status.closedReason &&
          !/contact support/i.test(config.status.closedReason) &&
          !/temporarily closed/i.test(config.status.closedReason)
        ? config.status.closedReason
        : outsideHours
          ? "Check back during our next opening time."
          : "We'll be back soon — track an existing order or reach out if you need help.";

  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,102,255,0.12),_transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-[#001F5C]/5 blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center animate-servgo-fade-up">
        {config.store.logoUrl ? (
          <Image
            src={config.store.logoUrl}
            alt={config.store.name}
            width={96}
            height={96}
            className="h-20 w-20 rounded-2xl object-cover shadow-lg ring-4 ring-white sm:h-24 sm:w-24"
            unoptimized
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0066FF] text-3xl font-bold text-white shadow-lg ring-4 ring-white sm:h-24 sm:w-24">
            {config.store.name.slice(0, 1).toUpperCase()}
          </div>
        )}

        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#001F5C] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Closed
        </span>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#001F5C] sm:text-4xl">
          {config.store.name}
        </h1>
        <p className="mt-2 text-lg font-semibold text-[#0052CC] sm:text-xl">{headline}</p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {supporting}
        </p>

        {countdown && nextOpen ? (
          <div className="mt-8 w-full max-w-md">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#0052CC]">
              Opens in
            </p>
            <div className="flex items-stretch justify-center gap-2 sm:gap-3">
              {showDays ? <CountdownDigit value={countdown.days} label="Days" /> : null}
              <CountdownDigit value={countdown.hours} label="Hrs" />
              <CountdownDigit value={countdown.minutes} label="Min" />
              <CountdownDigit value={countdown.seconds} label="Sec" />
            </div>
            {nextOpen.closeTime ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Then open until{" "}
                <span className="font-semibold text-[#001F5C]">
                  {formatDisplayTime(nextOpen.closeTime)}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/track"
            className="inline-flex items-center justify-center rounded-full bg-[#0066FF] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0052CC]"
          >
            Track an order
          </Link>
          {waDigits ? (
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-[#001F5C]/12 bg-white px-5 py-3 text-sm font-semibold text-[#001F5C] transition hover:border-[#0066FF]/40 hover:bg-[#0066FF]/5"
            >
              Message on WhatsApp
            </a>
          ) : phone ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#001F5C]/12 bg-white px-5 py-3 text-sm font-semibold text-[#001F5C] transition hover:border-[#0066FF]/40 hover:bg-[#0066FF]/5"
            >
              <Phone className="h-4 w-4 text-[#0066FF]" />
              Call us
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
