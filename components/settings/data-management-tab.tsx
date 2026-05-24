"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { previewDataPurge, executeDataPurge } from "@/lib/actions/admin-data";

export function DataManagementTab() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeOrders, setIncludeOrders] = useState(false);
  const [includePayments, setIncludePayments] = useState(true);
  const [includeKitchen, setIncludeKitchen] = useState(true);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [preview, setPreview] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);

  const input = {
    startDate,
    endDate,
    includeOrders,
    includePayments: includeOrders && includePayments,
    includeKitchen: includeOrders && includeKitchen,
  };

  const handlePreview = async () => {
    if (!startDate || !endDate) {
      toast.error("Select start and end dates");
      return;
    }
    setLoading(true);
    const result = await previewDataPurge(input);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setPreview(result.data || null);
  };

  const handleExecute = async () => {
    if (!startDate || !endDate) {
      toast.error("Select start and end dates");
      return;
    }
    setLoading(true);
    const result = await executeDataPurge({ ...input, confirmation, reason });
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Data purge completed");
    setPreview(null);
    setConfirmation("");
    setReason("");
  };

  return (
    <Card className="chart-card rounded-xl border-destructive/30">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Data management
        </CardTitle>
        <CardDescription className="text-xs">
          Permanently delete transactions and optionally related orders for a date range.
          This cannot be undone. Inventory outbound from sales is not reversed.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="includeOrders"
              checked={includeOrders}
              onCheckedChange={(v) => setIncludeOrders(!!v)}
            />
            <Label htmlFor="includeOrders" className="text-xs font-normal">
              Include orders (and related records)
            </Label>
          </div>
          {includeOrders && (
            <>
              <div className="flex items-center gap-2 ml-6">
                <Checkbox
                  id="includePayments"
                  checked={includePayments}
                  onCheckedChange={(v) => setIncludePayments(!!v)}
                />
                <Label htmlFor="includePayments" className="text-xs font-normal">
                  Include payments
                </Label>
              </div>
              <div className="flex items-center gap-2 ml-6">
                <Checkbox
                  id="includeKitchen"
                  checked={includeKitchen}
                  onCheckedChange={(v) => setIncludeKitchen(!!v)}
                />
                <Label htmlFor="includeKitchen" className="text-xs font-normal">
                  Include kitchen tickets
                </Label>
              </div>
            </>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={handlePreview} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Preview counts
        </Button>

        {preview && (
          <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
            {Object.entries(preview).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Reason (required)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Type DELETE to confirm</Label>
          <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleExecute}
          disabled={loading || confirmation !== "DELETE"}
        >
          {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Execute purge
        </Button>
      </CardContent>
    </Card>
  );
}
