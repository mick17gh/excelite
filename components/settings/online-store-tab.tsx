"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { generateStorefrontConfig, getOnlineStoreSettings, updateOrganization } from "@/lib/actions/organization";
import type { StoreBanner } from "@/lib/storefront/banners";
import { StoreBannerManager } from "@/components/settings/store-banner-manager";

const templateOptions = ["classic", "modern", "quick", "marketplace", "minimal"];

type Props = {
  organizationId: string;
  tier: "FREE" | "PRO" | "ENTERPRISE";
};

export function OnlineStoreTab({ organizationId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [logoUploading, setLogoUploading] = useState(false);
  const [form, setForm] = useState({
    onlineOrderingEnabled: false,
    cashCheckoutEnabled: true,
    whatsappOrderingEnabled: false,
    storefrontUrl: "",
    storeSlug: "",
    storeName: "",
    storeDescription: "",
    storeLogoUrl: "",
    storeTimezone: "Africa/Accra",
    storefrontTemplateId: "classic",
    closureMessage: "Online ordering is paused. Please check back soon.",
    deliveryEnabled: true,
    pickupEnabled: true,
    minOrderAmount: "",
    deliveryFeeFlat: "",
    deliveryRadius: "",
    estimatedPrepTime: "",
    contactPhone: "",
    contactEmail: "",
    whatsappNumber: "",
    facebookUrl: "",
    instagramUrl: "",
    paystackEnabled: false,
    businessHoursJson: "",
  });

  const apiBaseUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_SERVSTACK_API_URL || "").replace(/\/$/, ""),
    []
  );
  const endpointBase = apiBaseUrl || "https://your-servgo-domain.com";
  const publicEndpoints = useMemo(
    () => ({
      config: `${endpointBase}/api/public/store/${organizationId}/config`,
      menu: `${endpointBase}/api/public/store/${organizationId}/menu`,
      branches: `${endpointBase}/api/public/store/${organizationId}/branches`,
      orders: `${endpointBase}/api/public/store/${organizationId}/orders`,
    }),
    [endpointBase, organizationId]
  );

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      const result = await getOnlineStoreSettings(organizationId);
      if (!result.data) {
        toast.error(result.error || "Failed to load online store settings");
        setIsLoading(false);
        return;
      }

      setBanners(result.data.storeBanners || []);
      setForm({
        onlineOrderingEnabled: result.data.onlineOrderingEnabled,
        cashCheckoutEnabled: result.data.cashCheckoutEnabled !== false,
        whatsappOrderingEnabled: Boolean(result.data.whatsappOrderingEnabled),
        storefrontUrl: result.data.storefrontUrl || "",
        storeSlug: result.data.storeSlug || "",
        storeName: result.data.storeName || "",
        storeDescription: result.data.storeDescription || "",
        storeLogoUrl: result.data.storeLogoUrl || "",
        storeTimezone: result.data.storeTimezone || "Africa/Accra",
        storefrontTemplateId: result.data.storefrontTemplateId || "classic",
        closureMessage: result.data.closureMessage || "Online ordering is paused. Please check back soon.",
        deliveryEnabled: result.data.deliveryEnabled,
        pickupEnabled: result.data.pickupEnabled,
        minOrderAmount: result.data.minOrderAmount?.toString() || "",
        deliveryFeeFlat: result.data.deliveryFeeFlat?.toString() || "",
        deliveryRadius: result.data.deliveryRadius?.toString() || "",
        estimatedPrepTime: result.data.estimatedPrepTime?.toString() || "",
        contactPhone: result.data.contactPhone || "",
        contactEmail: result.data.contactEmail || "",
        whatsappNumber: result.data.whatsappNumber || "",
        facebookUrl: result.data.facebookUrl || "",
        instagramUrl: result.data.instagramUrl || "",
        paystackEnabled: Boolean(result.data.paystackEnabled),
        businessHoursJson: JSON.stringify(
          result.data.businessHours || {
            monday: { open: "10:00", close: "22:00" },
            tuesday: { open: "10:00", close: "22:00" },
            wednesday: { open: "10:00", close: "22:00" },
            thursday: { open: "10:00", close: "22:00" },
            friday: { open: "10:00", close: "23:00" },
            saturday: { open: "10:00", close: "23:00" },
            sunday: { open: "12:00", close: "21:00" },
          },
          null,
          2
        ),
      });
      setIsLoading(false);
    }

    loadSettings();
  }, [organizationId]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }
    setLogoUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("folder", "store");
      const uploadResponse = await fetch("/api/upload", { method: "POST", body: uploadFormData });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadData.url) {
        toast.error(uploadData.error || "Failed to upload logo");
        return;
      }
      setForm((prev) => ({ ...prev, storeLogoUrl: uploadData.url as string }));
      toast.success("Logo uploaded");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = () => {
    if (
      form.onlineOrderingEnabled &&
      !form.cashCheckoutEnabled &&
      !form.whatsappOrderingEnabled &&
      !form.paystackEnabled
    ) {
      toast.error("Enable at least one checkout method before publishing");
      return;
    }
    if (form.whatsappOrderingEnabled && !form.whatsappNumber.trim()) {
      toast.error("WhatsApp number is required for WhatsApp ordering");
      return;
    }

    startTransition(async () => {
      let parsedBusinessHours: Record<string, { open: string; close: string; closed?: boolean }> | null = null;
      try {
        parsedBusinessHours = form.businessHoursJson.trim()
          ? (JSON.parse(form.businessHoursJson) as Record<string, { open: string; close: string; closed?: boolean }>)
          : null;
      } catch {
        toast.error("Business hours must be valid JSON");
        return;
      }

      const result = await updateOrganization({
        id: organizationId,
        onlineOrderingEnabled: form.onlineOrderingEnabled,
        cashCheckoutEnabled: form.cashCheckoutEnabled,
        whatsappOrderingEnabled: form.whatsappOrderingEnabled,
        storefrontUrl: form.storefrontUrl.trim() || null,
        storeSlug: form.storeSlug || null,
        storeName: form.storeName || null,
        storeDescription: form.storeDescription || null,
        storeLogoUrl: form.storeLogoUrl.trim() || null,
        // Banners persist immediately from StoreBannerManager — omit here so a
        // stale empty local state cannot wipe a just-published upload.
        storeTimezone: form.storeTimezone || "Africa/Accra",
        storefrontTemplateId: form.storefrontTemplateId,
        businessHours: parsedBusinessHours,
        closureMessage: form.closureMessage || null,
        deliveryEnabled: form.deliveryEnabled,
        pickupEnabled: form.pickupEnabled,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
        deliveryFeeFlat: form.deliveryFeeFlat ? Number(form.deliveryFeeFlat) : null,
        deliveryRadius: form.deliveryRadius ? Number(form.deliveryRadius) : null,
        estimatedPrepTime: form.estimatedPrepTime ? Number(form.estimatedPrepTime) : null,
        contactPhone: form.contactPhone || null,
        contactEmail: form.contactEmail || null,
        whatsappNumber: form.whatsappNumber || null,
        facebookUrl: form.facebookUrl || null,
        instagramUrl: form.instagramUrl || null,
        paystackEnabled: form.paystackEnabled,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }
      const reload = await getOnlineStoreSettings(organizationId);
      if (reload.data?.storeBanners) {
        setBanners(reload.data.storeBanners);
      }
      toast.success("Online store settings saved");
    });
  };

  const handleDownloadConfig = () => {
    startTransition(async () => {
      const result = await generateStorefrontConfig(organizationId);
      if (!result.data) {
        toast.error(result.error || "Failed to generate config");
        return;
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "store.config.json";
      anchor.click();
      URL.revokeObjectURL(url);
    });
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="chart-card rounded-xl">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="h-4 w-4" />
          Online Store
          <Badge className={form.onlineOrderingEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
            {form.onlineOrderingEnabled ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure white-label storefront settings and template structure. Paystack keys are set via server environment variables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 pt-0">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Publish online store</p>
            <p className="text-xs text-muted-foreground">When disabled, public storefront endpoints return maintenance status.</p>
          </div>
          <Switch
            checked={form.onlineOrderingEnabled}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, onlineOrderingEnabled: checked }))}
          />
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Checkout methods</p>
          <p className="text-xs text-muted-foreground">Customers only see methods you enable. Enable at least one when publishing.</p>
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <div>
              <p className="text-sm">Manual / pay at pickup or delivery</p>
              <p className="text-xs text-muted-foreground">Creates an unpaid order in ServGo.</p>
            </div>
            <Switch
              checked={form.cashCheckoutEnabled}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, cashCheckoutEnabled: checked }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <div>
              <p className="text-sm">Order via WhatsApp</p>
              <p className="text-xs text-muted-foreground">Sends the cart to WhatsApp — no ServGo order.</p>
            </div>
            <Switch
              checked={form.whatsappOrderingEnabled}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, whatsappOrderingEnabled: checked }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <div>
              <p className="text-sm">Paystack</p>
              <p className="text-xs text-muted-foreground">Card checkout on the storefront.</p>
            </div>
            <Switch
              checked={form.paystackEnabled}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, paystackEnabled: checked }))}
            />
          </div>
        </div>

        {form.onlineOrderingEnabled && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Storefront URL</Label>
            <Input
              value={form.storefrontUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, storefrontUrl: e.target.value }))}
              className="h-9"
              placeholder="https://your-store.example.com"
            />
            <p className="text-xs text-muted-foreground">
              Customer link for POS receipt QR codes. QR appears on receipts only when this URL is saved.
            </p>
          </div>
        )}

        {form.onlineOrderingEnabled && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Connection Details</p>
              <Badge className="bg-emerald-100 text-emerald-700">Enabled</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
                <span className="min-w-28 text-xs text-muted-foreground">Organization ID</span>
                <code className="text-xs">{organizationId}</code>
                <Button variant="ghost" size="sm" className="ml-auto h-7 px-2" onClick={() => copyToClipboard(organizationId, "Organization ID")}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
                <span className="min-w-28 text-xs text-muted-foreground">API Base URL</span>
                <code className="text-xs">{apiBaseUrl || "Not set in env (using placeholder below)"}</code>
                {apiBaseUrl && (
                  <Button variant="ghost" size="sm" className="ml-auto h-7 px-2" onClick={() => copyToClipboard(apiBaseUrl, "API base URL")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {Object.entries(publicEndpoints).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
                  <span className="min-w-28 text-xs capitalize text-muted-foreground">{key}</span>
                  <code className="truncate text-xs">{value}</code>
                  <Button variant="ghost" size="sm" className="ml-auto h-7 px-2" onClick={() => copyToClipboard(value, `${key} endpoint`)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Store Name</Label>
            <Input value={form.storeName} onChange={(e) => setForm((prev) => ({ ...prev, storeName: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Store Slug</Label>
            <Input value={form.storeSlug} onChange={(e) => setForm((prev) => ({ ...prev, storeSlug: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Store Description</Label>
            <Textarea value={form.storeDescription} onChange={(e) => setForm((prev) => ({ ...prev, storeDescription: e.target.value }))} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Store logo</Label>
            <div className="flex flex-wrap items-center gap-3">
              {form.storeLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.storeLogoUrl} alt="Store logo" className="h-14 w-14 rounded-lg object-cover border" />
              ) : (
                <div className="h-14 w-14 rounded-lg border border-dashed flex items-center justify-center text-[10px] text-muted-foreground">
                  No logo
                </div>
              )}
              <div className="flex flex-col gap-2 min-w-[200px] flex-1">
                <Input
                  value={form.storeLogoUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, storeLogoUrl: e.target.value }))}
                  className="h-9"
                  placeholder="https://… or upload"
                />
                <div className="flex gap-2">
                  <Label className="inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-xs">
                    {logoUploading ? "Uploading…" : "Upload"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} disabled={logoUploading || isPending} />
                  </Label>
                  {form.storeLogoUrl ? (
                    <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setForm((prev) => ({ ...prev, storeLogoUrl: "" }))}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <StoreBannerManager
              organizationId={organizationId}
              banners={banners}
              onChange={setBanners}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Storefront Template</Label>
            <Select value={form.storefrontTemplateId} onValueChange={(value) => setForm((prev) => ({ ...prev, storefrontTemplateId: value }))}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templateOptions.map((template) => (
                  <SelectItem key={template} value={template}>
                    {template}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Store Timezone</Label>
            <Input value={form.storeTimezone} onChange={(e) => setForm((prev) => ({ ...prev, storeTimezone: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Estimated Prep Time (minutes)</Label>
            <Input value={form.estimatedPrepTime} onChange={(e) => setForm((prev) => ({ ...prev, estimatedPrepTime: e.target.value }))} className="h-9" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Min Order Amount</Label>
            <Input value={form.minOrderAmount} onChange={(e) => setForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Delivery Fee</Label>
            <Input value={form.deliveryFeeFlat} onChange={(e) => setForm((prev) => ({ ...prev, deliveryFeeFlat: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Delivery Radius (km)</Label>
            <Input value={form.deliveryRadius} onChange={(e) => setForm((prev) => ({ ...prev, deliveryRadius: e.target.value }))} className="h-9" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm">Delivery enabled</span>
            <Switch checked={form.deliveryEnabled} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, deliveryEnabled: checked }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm">Pickup enabled</span>
            <Switch checked={form.pickupEnabled} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, pickupEnabled: checked }))} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Contact Phone</Label>
            <Input value={form.contactPhone} onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contact Email</Label>
            <Input value={form.contactEmail} onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">WhatsApp Number</Label>
            <Input value={form.whatsappNumber} onChange={(e) => setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Facebook URL</Label>
            <Input value={form.facebookUrl} onChange={(e) => setForm((prev) => ({ ...prev, facebookUrl: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Instagram URL</Label>
            <Input value={form.instagramUrl} onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value }))} className="h-9" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Paystack keys use PAYSTACK_PUBLIC_KEY / PAYSTACK_SECRET_KEY (server) and NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY (storefront).
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs">Closure Message</Label>
          <Textarea value={form.closureMessage} onChange={(e) => setForm((prev) => ({ ...prev, closureMessage: e.target.value }))} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Business Hours (JSON)</Label>
          <Textarea
            value={form.businessHoursJson}
            onChange={(e) => setForm((prev) => ({ ...prev, businessHoursJson: e.target.value }))}
            className="font-mono text-xs min-h-40"
          />
          <p className="text-[11px] text-muted-foreground">
            Use 24-hour format. Example: monday: {"{ open: \"10:00\", close: \"22:00\" }"}.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={handleDownloadConfig} disabled={isPending}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download Config
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Save Online Store
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
