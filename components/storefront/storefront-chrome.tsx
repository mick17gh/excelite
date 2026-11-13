"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock3, Phone, ShoppingBag } from "lucide-react";
import type { PublicStoreConfig } from "@/lib/storefront/config";
import { normalizeWhatsAppDigits } from "@/lib/storefront/whatsapp-order-message";
import { SERVGO_BRAND } from "@/lib/brand-config";

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DAY_LABEL: Record<(typeof DAY_ORDER)[number], string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

type Props = {
  config: PublicStoreConfig;
  cartCount?: number;
  cartPulseKey?: number;
  onOpenCart?: () => void;
  children: React.ReactNode;
};

export function StorefrontChrome({
  config,
  cartCount = 0,
  cartPulseKey = 0,
  onOpenCart,
  children,
}: Props) {
  const phone = config.contact.phone?.trim() || null;
  const whatsapp = config.contact.whatsapp?.trim() || null;
  const waDigits = whatsapp ? normalizeWhatsAppDigits(whatsapp) : "";
  const open = Boolean(config.status.enabled && config.status.isOpenNow);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(0,102,255,0.08),_transparent_55%),linear-gradient(180deg,#F8FAFC_0%,#ffffff_45%)] text-[#001F5C]">
      <header className="sticky top-0 z-40 border-b border-[#001F5C]/8 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            {config.store.logoUrl ? (
              <Image
                src={config.store.logoUrl}
                alt={config.store.name}
                width={44}
                height={44}
                className="h-11 w-11 rounded-xl object-cover ring-2 ring-[#0066FF]/20"
                unoptimized
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0066FF] text-sm font-bold text-white shadow-sm">
                {config.store.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight text-[#001F5C]">
                {config.store.name}
              </p>
              {open ? (
                <p className="mt-0.5">
                  <span className="inline-flex items-center rounded-full bg-[#0066FF]/12 px-2 py-0.5 text-[10px] font-semibold text-[#0052CC]">
                    Open now
                  </span>
                </p>
              ) : null}
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/track"
              className="hidden rounded-full border border-[#001F5C]/10 px-3 py-1.5 text-xs font-semibold text-[#001F5C] hover:border-[#0066FF]/40 hover:bg-[#0066FF]/5 sm:inline-flex"
            >
              Track order
            </Link>
            {onOpenCart ? (
              <button
                key={cartPulseKey > 0 ? `cart-pulse-${cartPulseKey}` : "cart"}
                type="button"
                onClick={onOpenCart}
                className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0066FF] text-white shadow-sm transition hover:bg-[#0052CC] ${
                  cartPulseKey > 0 ? "animate-storefront-cart-shake" : ""
                }`}
                aria-label="Open cart"
              >
                <ShoppingBag className="h-4 w-4" />
                {cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#001F5C] px-1 text-[10px] font-semibold text-white">
                    {cartCount}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-28">{children}</main>

      <footer className="border-t border-[#001F5C]/8 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="text-sm font-bold text-[#001F5C]">{config.store.name}</p>
            {config.store.description ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {config.store.description}
              </p>
            ) : null}
            <Link
              href="/track"
              className="mt-4 inline-block text-sm font-semibold text-[#0052CC] hover:text-[#001F5C]"
            >
              Track your order →
            </Link>
          </div>

          <div>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#001F5C]">
              <Clock3 className="h-4 w-4 text-[#0066FF]" /> Hours
            </p>
            {Object.keys(config.hours.weekly || {}).length ? (
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {DAY_ORDER.map((day) => {
                  const slot = config.hours.weekly?.[day];
                  const label = DAY_LABEL[day];
                  if (!slot || slot.closed) {
                    return (
                      <li key={day} className="flex justify-between gap-4">
                        <span>{label}</span>
                        <span className="text-slate-400">Closed</span>
                      </li>
                    );
                  }
                  return (
                    <li key={day} className="flex justify-between gap-4">
                      <span>{label}</span>
                      <span className="font-medium text-[#001F5C]">
                        {slot.open}–{slot.close}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {config.hours.description || "Always open"}
              </p>
            )}
          </div>

          <div>
            <p className="mb-3 text-sm font-bold text-[#001F5C]">Contact</p>
            <div className="space-y-2.5 text-sm">
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 font-medium text-[#001F5C] hover:text-[#0052CC]"
                >
                  <Phone className="h-4 w-4 text-[#0066FF]" />
                  {phone}
                </a>
              ) : null}
              {waDigits ? (
                <a
                  href={`https://wa.me/${waDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0066FF]/12 px-3 py-1.5 font-semibold text-[#0052CC] hover:bg-[#0066FF]/20"
                >
                  WhatsApp us
                </a>
              ) : null}
              {!phone && !waDigits ? (
                <p className="text-muted-foreground">Contact details coming soon.</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="border-t border-[#001F5C]/6 px-4 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Powered by</span>
            <Image
              src={SERVGO_BRAND.logo}
              alt={SERVGO_BRAND.name}
              width={72}
              height={20}
              className="h-5 w-auto object-contain"
              unoptimized
            />
            <span className="font-semibold text-[#001F5C]">{SERVGO_BRAND.shortName}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
