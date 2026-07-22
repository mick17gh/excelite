"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreditCard, X } from "lucide-react";
import { countBranchesWithoutPaystackSubaccount } from "@/lib/actions/paystack-branch";

const DISMISS_KEY = "excelite.paystack-setup-banner.dismissed";

interface PaystackSetupBannerProps {
  organizationId: string;
  paystackEnabled: boolean;
  firstBranch?: { id: string; name: string } | null;
}

export function PaystackSetupBanner({
  organizationId,
  paystackEnabled,
  firstBranch,
}: PaystackSetupBannerProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!paystackEnabled || !organizationId) {
      setPendingCount(0);
      return;
    }
    countBranchesWithoutPaystackSubaccount(organizationId).then((res) => {
      if (res.success) setPendingCount(res.data.count);
    });
  }, [organizationId, paystackEnabled]);

  if (!paystackEnabled || pendingCount <= 0 || dismissed || !firstBranch) {
    return null;
  }

  return (
    <Alert className="content-card border-primary/25 bg-primary/5 rounded-xl">
      <CreditCard className="h-4 w-4" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <AlertTitle>Configure branch Paystack settlement</AlertTitle>
          <AlertDescription>
            Paystack is enabled but {pendingCount} branch{pendingCount === 1 ? "" : "es"} still
            need a linked subaccount before card payments can be accepted. Start with{" "}
            <strong>{firstBranch.name}</strong>.
          </AlertDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" asChild>
            <Link href="/dashboard/settings">Set up payments</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, "1");
              setDismissed(true);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}
