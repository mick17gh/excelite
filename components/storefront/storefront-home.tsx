"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import type { PublicStoreConfig } from "@/lib/storefront/config";
import type { PublicMenuItem } from "@/lib/storefront/menu";
import { resolveStoreBanners } from "@/lib/storefront/banners";
import {
  cartItemsSubtotal,
  cartLineKey,
  clearStorefrontCart,
  lineUnitTotal,
  loadStorefrontCart,
  saveStorefrontCart,
  type StorefrontCartLine,
} from "@/lib/storefront/cart-storage";
import { StorefrontChrome } from "@/components/storefront/storefront-chrome";
import { StorefrontBannerCarousel } from "@/components/storefront/storefront-banner-carousel";
import { StorefrontClosed } from "@/components/storefront/storefront-closed";
import { StorefrontProductCard } from "@/components/storefront/storefront-product-card";

type Props = {
  organizationId: string;
};

export function StorefrontHome({ organizationId }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<PublicStoreConfig | null>(null);
  const [menu, setMenu] = useState<PublicMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [cart, setCart] = useState<StorefrontCartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartPulseKey, setCartPulseKey] = useState(0);
  const [pickerItem, setPickerItem] = useState<PublicMenuItem | null>(null);
  const [pickerSelections, setPickerSelections] = useState<Record<string, string[]>>({});

  const notifyAddedToCart = useCallback((itemName: string) => {
    setCartPulseKey((n) => n + 1);
    toast.success("Added to cart", {
      description: itemName,
      duration: 1800,
    });
  }, []);

  useEffect(() => {
    setCart(loadStorefrontCart(organizationId));
  }, [organizationId]);

  useEffect(() => {
    saveStorefrontCart(organizationId, cart);
  }, [organizationId, cart]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [configRes, menuRes] = await Promise.all([
          fetch(`/api/public/store/${organizationId}/config`),
          fetch(`/api/public/store/${organizationId}/menu`),
        ]);
        const configJson = await configRes.json();
        const menuJson = await menuRes.json();
        if (!configJson.data) throw new Error(configJson.error || "Store unavailable");
        if (!menuRes.ok && !menuJson.data) throw new Error(menuJson.error || "Menu unavailable");
        if (cancelled) return;
        setConfig(configJson.data as PublicStoreConfig);
        setMenu((menuJson.data || []) as PublicMenuItem[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load store");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of menu) {
      if (item.category) map.set(item.category.id, item.category.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [menu]);

  const visibleMenu = useMemo(() => {
    if (categoryId === "all") return menu;
    return menu.filter((item) => item.category?.id === categoryId);
  }, [menu, categoryId]);

  const banners = useMemo(() => {
    if (!config) return [];
    return resolveStoreBanners(config.store.banners, config.store.bannerUrl);
  }, [config]);

  const cartCount = cart.reduce((n, line) => n + line.quantity, 0);
  const subtotal = cartItemsSubtotal(cart);
  const currency = config?.checkout.currency || "GHS";
  const canCheckout = Boolean(config?.status.enabled && config.status.isOpenNow);
  const canBrowseOrder = Boolean(config?.status.enabled);
  const isStoreClosed = Boolean(config && (!config.status.enabled || !config.status.isOpenNow));

  const addSimpleItem = useCallback((item: PublicMenuItem) => {
    if (item.optionGroups.length > 0) {
      const defaults: Record<string, string[]> = {};
      for (const group of item.optionGroups) {
        defaults[group.id] = group.options.filter((o) => o.isDefault).map((o) => o.id);
      }
      setPickerSelections(defaults);
      setPickerItem(item);
      return;
    }
    setCart((prev) => {
      const key = cartLineKey(item.id, []);
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        return prev.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          key,
          menuItemId: item.id,
          name: item.name,
          unitPrice: item.price,
          quantity: 1,
          options: [],
        },
      ];
    });
    notifyAddedToCart(item.name);
  }, [notifyAddedToCart]);

  const confirmPicker = () => {
    if (!pickerItem) return;
    for (const group of pickerItem.optionGroups) {
      const selected = pickerSelections[group.id] || [];
      if (group.isRequired && selected.length < Math.max(1, group.minSelections)) return;
      if (selected.length < group.minSelections) return;
      if (selected.length > group.maxSelections) return;
    }
    const options = pickerItem.optionGroups.flatMap((group) => {
      const selected = pickerSelections[group.id] || [];
      return group.options
        .filter((opt) => selected.includes(opt.id))
        .map((opt) => ({
          optionId: opt.id,
          name: opt.name,
          priceDelta: Number(opt.priceDelta),
        }));
    });
    const key = cartLineKey(
      pickerItem.id,
      options.map((o) => o.optionId),
    );
    const addedName = pickerItem.name;
    setCart((prev) => {
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        return prev.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          key,
          menuItemId: pickerItem.id,
          name: pickerItem.name,
          unitPrice: pickerItem.price,
          quantity: 1,
          options,
        },
      ];
    });
    setPickerItem(null);
    notifyAddedToCart(addedName);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAF8]">
        <Loader2 className="h-7 w-7 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8FAF8] px-4 text-center">
        <p className="text-lg font-bold text-[#001F5C]">Store unavailable</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {error || "Please try again later."}
        </p>
      </div>
    );
  }

  if (isStoreClosed) {
    return (
      <StorefrontChrome config={config}>
        <StorefrontClosed config={config} />
      </StorefrontChrome>
    );
  }

  return (
    <StorefrontChrome
      config={config}
      cartCount={cartCount}
      cartPulseKey={cartPulseKey}
      onOpenCart={() => setCartOpen(true)}
    >
      {banners.length > 0 ? (
        <StorefrontBannerCarousel
          banners={banners}
          storeName={config.store.name}
          className="mb-8"
        />
      ) : (
        <div className="mb-8 overflow-hidden rounded-3xl border border-[#0066FF]/15 bg-gradient-to-br from-[#0066FF]/15 via-white to-[#001F5C]/5 px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0052CC]">
            Order online
          </p>
          <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-[#001F5C] sm:text-5xl">
            {config.store.name}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            {config.store.description || "Browse the menu and place your order in a few taps."}
          </p>
        </div>
      )}

      {banners.length > 0 ? (
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#001F5C] sm:text-3xl">
            {config.store.name}
          </h1>
          {config.store.description ? (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {config.store.description}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategoryId("all")}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
            categoryId === "all"
              ? "bg-[#0066FF] text-white shadow-sm"
              : "border border-[#001F5C]/10 bg-white text-[#001F5C] hover:border-[#0066FF]/40"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryId(cat.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              categoryId === cat.id
                ? "bg-[#0066FF] text-white shadow-sm"
                : "border border-[#001F5C]/10 bg-white text-[#001F5C] hover:border-[#0066FF]/40"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {visibleMenu.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#001F5C]/15 bg-white px-6 py-16 text-center">
          <p className="font-semibold text-[#001F5C]">No products yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Check back soon for the full menu.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {visibleMenu.map((item) => (
            <StorefrontProductCard
              key={item.id}
              item={item}
              currency={currency}
              disabled={!canBrowseOrder}
              onAdd={() => addSimpleItem(item)}
            />
          ))}
        </div>
      )}

      {cartCount > 0 && !cartOpen ? (
        <div className="fixed inset-x-0 bottom-4 z-40 px-4">
          <button
            key={cartPulseKey > 0 ? `bar-pulse-${cartPulseKey}` : "cart-bar"}
            type="button"
            onClick={() => setCartOpen(true)}
            className={`mx-auto flex w-full max-w-md items-center justify-between rounded-2xl bg-[#001F5C] px-4 py-3.5 text-white shadow-xl ${
              cartPulseKey > 0 ? "animate-storefront-cart-shake" : ""
            }`}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <ShoppingBag className="h-4 w-4 text-[#0066FF]" />
              {cartCount} item{cartCount === 1 ? "" : "s"}
            </span>
            <span className="text-sm font-bold">
              {currency} {subtotal.toFixed(2)}
            </span>
          </button>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#001F5C]/40" onClick={() => setCartOpen(false)}>
          <aside
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#001F5C]/8 px-4 py-4">
              <h2 className="font-bold text-[#001F5C]">Your cart</h2>
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Close cart">
                <X className="h-5 w-5 text-[#001F5C]" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              ) : (
                cart.map((line) => (
                  <div
                    key={line.key}
                    className="rounded-2xl border border-[#001F5C]/8 bg-[#F8FAF8] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#001F5C]">{line.name}</p>
                        {line.options.length ? (
                          <p className="text-xs text-muted-foreground">
                            {line.options.map((o) => o.name).join(", ")}
                          </p>
                        ) : null}
                        <p className="mt-1 text-sm font-medium text-[#0052CC]">
                          {currency} {(lineUnitTotal(line) * line.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-[#001F5C]/15 bg-white p-1.5"
                          onClick={() =>
                            setCart((prev) =>
                              prev
                                .map((l) =>
                                  l.key === line.key ? { ...l, quantity: l.quantity - 1 } : l,
                                )
                                .filter((l) => l.quantity > 0),
                            )
                          }
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">{line.quantity}</span>
                        <button
                          type="button"
                          className="rounded-full border border-[#001F5C]/15 bg-white p-1.5"
                          onClick={() =>
                            setCart((prev) =>
                              prev.map((l) =>
                                l.key === line.key ? { ...l, quantity: l.quantity + 1 } : l,
                              ),
                            )
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3 border-t border-[#001F5C]/8 p-4">
              <div className="flex justify-between text-sm font-semibold text-[#001F5C]">
                <span>Subtotal</span>
                <span>
                  {currency} {subtotal.toFixed(2)}
                </span>
              </div>
              {cart.length > 0 ? (
                <button
                  type="button"
                  className="w-full text-left text-xs text-muted-foreground underline"
                  onClick={() => {
                    clearStorefrontCart(organizationId);
                    setCart([]);
                  }}
                >
                  Clear cart
                </button>
              ) : null}
              {canCheckout && cart.length > 0 ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-xl bg-[#0066FF] px-4 py-3 text-sm font-bold text-white hover:bg-[#0052CC]"
                  onClick={() => {
                    // Navigate before unmounting the drawer — Link + setCartOpen(false) can cancel navigation.
                    router.push("/checkout");
                  }}
                >
                  Checkout
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
                >
                  {!config.status.enabled || !config.status.isOpenNow
                    ? "Checkout unavailable"
                    : "Add items to checkout"}
                </button>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {pickerItem ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#001F5C]/45 sm:items-center"
          onClick={() => setPickerItem(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#001F5C]">{pickerItem.name}</h3>
            <p className="mt-1 text-sm font-semibold text-[#0052CC]">
              {currency} {pickerItem.price.toFixed(2)}
            </p>
            <div className="mt-4 space-y-4">
              {pickerItem.optionGroups.map((group) => (
                <div key={group.id}>
                  <p className="text-sm font-semibold text-[#001F5C]">
                    {group.name}
                    {group.isRequired ? " *" : ""}
                  </p>
                  <div className="mt-2 space-y-2">
                    {group.options.map((opt) => {
                      const selected = (pickerSelections[group.id] || []).includes(opt.id);
                      const multi = group.maxSelections > 1;
                      return (
                        <label
                          key={opt.id}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
                            selected
                              ? "border-[#0066FF] bg-[#0066FF]/8"
                              : "border-[#001F5C]/10"
                          }`}
                        >
                          <span className="flex items-center gap-2 font-medium text-[#001F5C]">
                            <input
                              type={multi ? "checkbox" : "radio"}
                              name={group.id}
                              checked={selected}
                              onChange={() => {
                                setPickerSelections((prev) => {
                                  const current = prev[group.id] || [];
                                  if (!multi) return { ...prev, [group.id]: [opt.id] };
                                  if (selected) {
                                    return {
                                      ...prev,
                                      [group.id]: current.filter((id) => id !== opt.id),
                                    };
                                  }
                                  if (current.length >= group.maxSelections) return prev;
                                  return { ...prev, [group.id]: [...current, opt.id] };
                                });
                              }}
                            />
                            {opt.name}
                          </span>
                          {Number(opt.priceDelta) !== 0 ? (
                            <span className="text-muted-foreground">
                              +{currency} {Number(opt.priceDelta).toFixed(2)}
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={confirmPicker}
              className="mt-5 w-full rounded-xl bg-[#0066FF] px-4 py-3 text-sm font-bold text-white hover:bg-[#0052CC]"
            >
              Add to cart
            </button>
          </div>
        </div>
      ) : null}
    </StorefrontChrome>
  );
}
