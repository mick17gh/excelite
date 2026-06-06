"use client";

import { ChangeEvent, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Building2, Users, GitBranch, Warehouse, Save, Loader2, Upload, Image as ImageIcon, X, CreditCard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getOrganization, updateOrganization } from "@/lib/actions/organization";
import { getTierLimits, TIER_DISPLAY_NAMES } from "@/lib/tier-config";
import { SubscriptionTier } from "@/lib/generated/prisma/client";
import Image from "next/image";

interface OrgData {
  id: string;
  name: string;
  storeLogoUrl?: string | null;
  tier: string;
  status: string;
  maxBranches: number;
  maxUsers: number;
  maxMenuItems: number | null;
  features: Record<string, boolean> | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  userCount: number;
  branchCount: number;
  warehouseCount: number;
  createdAt: string;
  paystackDashboardEnabled?: boolean;
}

const TIER_COLORS: Record<string, string> = {
  FREE: "bg-slate-100 text-slate-700",
  PRO: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-amber-100 text-amber-700",
};

interface OrganizationTabProps {
  organizationId?: string;
}

export function OrganizationTab({ organizationId }: OrganizationTabProps) {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [storeLogoUrl, setStoreLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [paystackDashboardEnabled, setPaystackDashboardEnabled] = useState(false);
  const [isSavingPayments, setIsSavingPayments] = useState(false);

  useEffect(() => {
    loadOrg();
  }, [organizationId]);

  const loadOrg = async () => {
    setIsLoading(true);
    try {
      const result = await getOrganization(organizationId);
      if (result.data) {
        setOrg(result.data as OrgData);
        setName(result.data.name);
        setStoreLogoUrl(result.data.storeLogoUrl || "");
        setLogoPreview(result.data.storeLogoUrl || null);
        setSelectedLogoFile(null);
        setPaystackDashboardEnabled(Boolean(result.data.paystackDashboardEnabled));
      }
    } catch {
      toast.error("Failed to load organization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    setSelectedLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setStoreLogoUrl("");
  };

  const clearLogo = () => {
    setSelectedLogoFile(null);
    setLogoPreview(null);
    setStoreLogoUrl("");
  };

  const handleSavePayments = async () => {
    if (!org) return;
    setIsSavingPayments(true);
    try {
      const result = await updateOrganization({
        id: org.id,
        paystackDashboardEnabled,
      });
      if (result.error) toast.error(result.error);
      else {
        setOrg((prev) => (prev ? { ...prev, paystackDashboardEnabled } : prev));
        toast.success("Payment settings saved");
      }
    } catch {
      toast.error("Failed to save payment settings");
    } finally {
      setIsSavingPayments(false);
    }
  };

  const handleSave = async () => {
    if (!org || !name.trim()) return;
    setIsSaving(true);
    try {
      let uploadedLogoUrl = storeLogoUrl.trim();
      if (selectedLogoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedLogoFile);
        uploadFormData.append("folder", "organization");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json();
          throw new Error(uploadError.error || "Failed to upload organization logo");
        }

        const uploadData = await uploadResponse.json();
        uploadedLogoUrl = uploadData.url;
      }

      const result = await updateOrganization({
        id: org.id,
        name: name.trim(),
        storeLogoUrl: uploadedLogoUrl || null,
      });
      if (result.error) toast.error(result.error);
      else {
        setStoreLogoUrl(uploadedLogoUrl || "");
        setLogoPreview(uploadedLogoUrl || null);
        setSelectedLogoFile(null);
        setOrg((prev) => (prev ? { ...prev, name: name.trim(), storeLogoUrl: uploadedLogoUrl || null } : prev));
        toast.success("Organization updated");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <Card className="chart-card rounded-xl">
        <CardContent className="p-6 text-center text-muted-foreground">
          No organization found. Contact support.
        </CardContent>
      </Card>
    );
  }

  const tier = org.tier as SubscriptionTier;
  const tierLimits = getTierLimits(tier);

  return (
    <div className="space-y-4">
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Organization
              </CardTitle>
              <CardDescription className="text-xs">Manage your organization details</CardDescription>
            </div>
            <Badge className={TIER_COLORS[org.tier] || ""}>
              {TIER_DISPLAY_NAMES[tier] || org.tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Organization Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <div className="flex items-center h-9">
                <Badge variant="outline" className="text-xs">
                  {org.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Organization Logo (optional)</Label>
            <div className="flex items-center gap-4 rounded-lg border p-3">
              <div className="relative h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 overflow-hidden flex items-center justify-center">
                {logoPreview || storeLogoUrl ? (
                  <>
                    <Image
                      src={logoPreview || storeLogoUrl}
                      alt="Organization logo preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5"
                      onClick={clearLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="org-settings-logo-upload"
                />
                <Label
                  htmlFor="org-settings-logo-upload"
                  className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Upload className="h-4 w-4" />
                  Upload Logo
                </Label>
                <p className="text-xs text-muted-foreground">Max 5MB. JPG, PNG, or WebP.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Payments
          </CardTitle>
          <CardDescription className="text-xs">
            Dashboard payment options. Online store Paystack is configured separately in Online Store settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <span className="text-sm">Enable Paystack (Dashboard)</span>
              <p className="text-xs text-muted-foreground">
                Shows &quot;Pay with Paystack&quot; on dashboard orders. Independent from the online store toggle.
                Keys: PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY.
              </p>
            </div>
            <Switch
              checked={paystackDashboardEnabled}
              onCheckedChange={setPaystackDashboardEnabled}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSavePayments} disabled={isSavingPayments}>
              {isSavingPayments ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Usage & Limits</CardTitle>
          <CardDescription className="text-xs">Current resource usage vs plan limits</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          <UsageMeter
            icon={GitBranch}
            label="Branches"
            used={org.branchCount}
            max={tierLimits.maxBranches}
          />
          <Separator />
          <UsageMeter icon={Users} label="Users" used={org.userCount} max={tierLimits.maxUsers} />
          <Separator />
          <UsageMeter
            icon={Warehouse}
            label="Warehouses"
            used={org.warehouseCount}
            max={tierLimits.maxWarehouses}
          />

          {org.trialEndsAt && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground">
                Trial ends: <strong>{new Date(org.trialEndsAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</strong>
              </div>
            </>
          )}

          <div className="text-xs text-muted-foreground">
            Organization created: {new Date(org.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsageMeter({ icon: Icon, label, used, max }: { icon: React.ElementType; label: string; used: number; max: number }) {
  const isUnlimited = !Number.isFinite(max);
  const pct = !isUnlimited && max > 0 ? Math.min((used / max) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span>{label}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {used} / {isUnlimited ? "∞" : max}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
