"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Loader2, Crown, Zap, Rocket, Building } from "lucide-react";
import { toast } from "sonner";
import { getOrganization } from "@/lib/actions/organization";
import { useCurrency } from "@/contexts/currency-context";

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
  { tier: "FREE", label: "Free", icon: Zap, price: 0, desc: "For small businesses getting started", features: ["1 Branch", "2 Users", "Basic POS", "Menu Management"] },
  { tier: "BASIC", label: "Basic", icon: Crown, price: 49, desc: "For growing restaurants", features: ["3 Branches", "10 Users", "Inventory", "Customer CRM", "Analytics"] },
  { tier: "PRO", label: "Pro", icon: Rocket, price: 149, desc: "For multi-branch operations", features: ["10 Branches", "50 Users", "Warehouse", "Delivery", "WhatsApp Orders", "API Access"] },
  { tier: "ENTERPRISE", label: "Enterprise", icon: Building, price: 0, desc: "Custom pricing for large chains", features: ["Unlimited Branches", "Unlimited Users", "Priority Support", "Custom Integrations"] },
];

const TIER_COLORS: Record<string, string> = {
  FREE: "bg-slate-100 text-slate-700",
  BASIC: "bg-blue-100 text-blue-700",
  PRO: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-amber-100 text-amber-700",
};

export function SubscriptionTab() {
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { formatCurrency } = useCurrency();

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
                {orgInfo.subscription.tier}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-medium">{formatCurrency(orgInfo.subscription.amount)}/{orgInfo.subscription.billingCycle}</p>
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
                    {plan.price > 0 ? `$${plan.price}/mo` : plan.tier === "ENTERPRISE" ? "Custom" : "Free"}
                  </p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {plan.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                  {!isCurrent && plan.tier !== "ENTERPRISE" && (
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => toast.info("Contact support to change plans")}>
                      {plan.price > (PLANS.find((p) => p.tier === orgInfo?.tier)?.price || 0) ? "Upgrade" : "Downgrade"}
                    </Button>
                  )}
                  {plan.tier === "ENTERPRISE" && !isCurrent && (
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => toast.info("Contact sales@servstack.com")}>
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
                  <TableHead className="text-right">Amount</TableHead>
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
                    <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
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
