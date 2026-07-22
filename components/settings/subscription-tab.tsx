"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Loader2, Zap, Rocket, Building } from "lucide-react";
import { toast } from "sonner";
import { getOrganization } from "@/lib/actions/organization";

interface SubscriptionData {
  id: string;
  tier: string;
  status: string;
  amount: number;
  currency: string;
  billingCycle: string;
  nextBillingDate: string | null;
  canceledAt: string | null;
  payments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string | null;
    reference: string | null;
    paidAt: string | null;
    createdAt: string;
  }[];
}

interface OrgInfo {
  tier: string;
  subscription: SubscriptionData | null;
}

const PLANS = [
  {
    tier: "FREE",
    label: "Basic",
    icon: Zap,
    desc: "Single-branch starter operations plan",
    features: [
      "Dashboard",
      "1 Branch",
      "1 Warehouse",
      "POS + Kitchen Display",
      "Inventory",
      "Unlimited Menu Items",
      "Up to 5 User Accounts",
      "Technical Support",
      "Free 1 Month Trial",
    ],
  },
  {
    tier: "PRO",
    label: "Pro",
    icon: Rocket,
    desc: "For growing multi-branch operations",
    features: [
      "Dashboard",
      "Up to 5 Branches",
      "Online Ordering",
      "POS + Kitchen Display",
      "Inventory + Warehouse",
      "Delivery Management",
      "Customer Management",
      "Up to 50 Users",
      "Sales & Revenue Reports",
      "AI Assistant",
      "Technical Support",
      "Free 1 Month Trial",
    ],
  },
  {
    tier: "ENTERPRISE",
    label: "Premium",
    icon: Building,
    desc: "Full premium suite for large organizations",
    features: [
      "Dashboard",
      "Unlimited Branches",
      "Online + WhatsApp Ordering",
      "POS + Kitchen Display",
      "Inventory + Warehouse",
      "Delivery + Customer Management",
      "Unlimited Users",
      "Executive & Custom Reports",
      "Staff Management + Sales Analytics",
      "AI Assistant + API Support",
      "Custom Alerts & Notifications",
      "Priority Support",
      "Technical Support",
      "Free 1 Month Trial",
    ],
  },
];

const TIER_COLORS: Record<string, string> = {
  FREE: "bg-slate-100 text-slate-700",
  PRO: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-amber-100 text-amber-700",
};

export function SubscriptionTab() {
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getOrganization();
      if (result.data) {
        setOrgInfo({
          tier: result.data.tier,
          subscription: result.data.subscription as SubscriptionData | null,
        });
      }
    } catch {
      toast.error("Failed to load subscription data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Plan */}
      {orgInfo?.subscription && (
        <Card className="chart-card rounded-xl">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Current Subscription
                </CardTitle>
                <CardDescription className="text-xs">Your active plan and billing details</CardDescription>
              </div>
              <Badge className={TIER_COLORS[orgInfo.subscription.tier] || ""}>
                {orgInfo.subscription.tier === "FREE"
                  ? "Basic"
                  : orgInfo.subscription.tier === "ENTERPRISE"
                    ? "Premium"
                    : "Pro"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-medium">Contact Sales</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline" className={`text-xs ${orgInfo.subscription.status === "ACTIVE" ? "text-green-600" : "text-amber-600"}`}>
                  {orgInfo.subscription.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next Billing</p>
                <p className="font-medium text-xs">
                  {orgInfo.subscription.nextBillingDate ? new Date(orgInfo.subscription.nextBillingDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="font-medium text-xs">{orgInfo.subscription.currency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Comparison */}
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Plans</CardTitle>
          <CardDescription className="text-xs">Compare plans and features</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const isCurrent = orgInfo?.tier === plan.tier;
              const PlanIcon = plan.icon;
              return (
                <div
                  key={plan.tier}
                  className={`border rounded-lg p-3 space-y-2 ${isCurrent ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <PlanIcon className="h-4 w-4" />
                    <span className="font-medium text-sm">{plan.label}</span>
                    {isCurrent && <Badge className="text-[10px] h-4">Current</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.desc}</p>
                  <p className="text-lg font-bold">
                    Contact Sales
                  </p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {plan.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => toast.info("Contact sales@excelite.app")}>
                      Contact Sales
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {orgInfo?.subscription?.payments && orgInfo.subscription.payments.length > 0 && (
        <Card className="chart-card rounded-xl">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Billing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgInfo.subscription.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.reference || "—"}</TableCell>
                    <TableCell className="text-sm capitalize">{p.paymentMethod || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${p.status === "PAID" ? "text-green-600" : "text-amber-600"}`}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">Contact Sales</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
