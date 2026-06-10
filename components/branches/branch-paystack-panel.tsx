"use client";

import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CreditCard, ChevronDown, Loader2, Link2, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  createBranchPaystackSubaccount,
  getPaystackBanksForBranch,
  linkBranchPaystackSubaccount,
  syncBranchPaystackSubaccount,
  unlinkBranchPaystackSubaccount,
  verifyBranchSettlementAccount,
} from "@/lib/actions/paystack-branch";

type PaystackBank = { name: string; code: string };

interface BranchPaystackPanelProps {
  branchId: string;
  branchName: string;
  paystackEnabled: boolean;
  paystackSubaccountCode?: string | null;
  paystackSubaccountActive?: boolean | null;
  paystackSubaccountSource?: string | null;
  settlementAccountName?: string | null;
  settlementAccountNumber?: string | null;
}

export function BranchPaystackPanel({
  branchId,
  branchName,
  paystackEnabled,
  paystackSubaccountCode,
  paystackSubaccountActive,
  paystackSubaccountSource,
  settlementAccountName,
  settlementAccountNumber,
}: BranchPaystackPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [linkCode, setLinkCode] = useState(paystackSubaccountCode || "");
  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState(settlementAccountName || "");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setLinkCode(paystackSubaccountCode || "");
    setResolvedName(settlementAccountName || "");
  }, [paystackSubaccountCode, settlementAccountName]);

  useEffect(() => {
    if (!paystackEnabled || paystackSubaccountCode) return;
    getPaystackBanksForBranch(branchId).then((res) => {
      if (res.success && res.data) setBanks(res.data);
    });
  }, [branchId, paystackEnabled, paystackSubaccountCode]);

  if (!paystackEnabled) {
    return (
      <Card className="px-6 py-6">
        <div className="text-base font-semibold flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Paystack settlement
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Enable Paystack in Settings → Online Store or Organization to configure branch payouts.
        </p>
      </Card>
    );
  }

  const isLinked = Boolean(paystackSubaccountCode?.trim());

  const statusBadge = !isLinked ? (
    <Badge variant="secondary">Not configured</Badge>
  ) : paystackSubaccountActive === false ? (
    <Badge variant="destructive">Inactive</Badge>
  ) : (
    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Linked
    </Badge>
  );

  const run = (fn: () => Promise<{ success: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await fn();
      if (result.success) {
        toast.success("Paystack settlement updated");
        router.refresh();
      } else {
        toast.error(result.error || "Action failed");
      }
    });
  };

  const handleVerify = () => {
    if (!bankCode || !accountNumber.trim()) {
      toast.error("Select a bank and enter account number");
      return;
    }
    startTransition(async () => {
      const result = await verifyBranchSettlementAccount({
        bankCode,
        accountNumber: accountNumber.trim(),
      });
      if (result.success && result.data) {
        setResolvedName(result.data.accountName);
        toast.success("Account verified");
      } else {
        toast.error(result.error || "Verification failed");
      }
    });
  };

  return (
    <Card className="py-0">
      <Accordion
        type="single"
        collapsible
        defaultValue={isLinked ? undefined : "paystack-settlement"}
      >
        <AccordionItem value="paystack-settlement" className="border-0">
          <div className="px-6 pt-6">
            <AccordionTrigger className="py-0 hover:no-underline">
              <span className="flex flex-1 items-start justify-between gap-4 pr-2 text-left pb-4">
                <span>
                  <span className="text-base font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Paystack settlement
                  </span>
                  <span className="block text-sm text-muted-foreground font-normal mt-1">
                  Route online and dashboard momo payments for {branchName} to this branch&apos;s
                  bank account.
                  </span>
                </span>
                {statusBadge}
              </span>
            </AccordionTrigger>
          </div>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4 pt-2">
              {isLinked && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Subaccount:</span>{" "}
                    <code className="font-mono text-xs">{paystackSubaccountCode}</code>
                  </p>
                  {paystackSubaccountSource && (
                    <p className="text-muted-foreground text-xs capitalize">
                      Source: {paystackSubaccountSource}
                    </p>
                  )}
                  {settlementAccountNumber && (
                    <p className="text-muted-foreground text-xs">
                      Account: {settlementAccountName || "—"} · {settlementAccountNumber}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => run(() => syncBranchPaystackSubaccount(branchId))}
                    >
                      {isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 h-3 w-3" />
                      )}
                      Refresh
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      disabled={isPending}
                      onClick={() => run(() => unlinkBranchPaystackSubaccount(branchId))}
                    >
                      <Unlink className="mr-1 h-3 w-3" />
                      Unlink
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="paystack-link-code">Link existing subaccount</Label>
                <p className="text-xs text-muted-foreground">
                  If you already created this subaccount in the Paystack Dashboard, paste the code
                  here.
                </p>
                <div className="flex gap-2">
                  <Input
                    id="paystack-link-code"
                    placeholder="ACCT_xxxxxxxxxx"
                    value={linkCode}
                    onChange={(e) => setLinkCode(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    disabled={isPending || !linkCode.trim()}
                    onClick={() => run(() => linkBranchPaystackSubaccount(branchId, linkCode.trim()))}
                  >
                    <Link2 className="mr-1 h-4 w-4" />
                    Link
                  </Button>
                </div>
              </div>

              <Collapsible open={createOpen} onOpenChange={setCreateOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Or create new subaccount
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${createOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="space-y-2">
                    <Label>Bank</Label>
                    <Select value={bankCode} onValueChange={setBankCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settlement-account">Account number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="settlement-account"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="0123456789"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleVerify}
                        disabled={isPending}
                      >
                        Verify
                      </Button>
                    </div>
                    {resolvedName && (
                      <p className="text-xs text-muted-foreground">Account name: {resolvedName}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    disabled={isPending || !bankCode || !accountNumber.trim()}
                    onClick={() =>
                      run(() =>
                        createBranchPaystackSubaccount(branchId, {
                          bankCode,
                          accountNumber: accountNumber.trim(),
                        }),
                      )
                    }
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create subaccount
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
