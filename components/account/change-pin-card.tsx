"use client";

import { useEffect, useState, useTransition } from "react";
import { ContentCard } from "@/components/dashboard/content-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { changePin, clearMyPin, getCurrentUser } from "@/lib/actions/settings";
import { dashboardPrimaryButtonClass } from "@/components/dashboard/dashboard-theme";

export function ChangePinCard() {
  const [isPending, startTransition] = useTransition();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [clearPinValue, setClearPinValue] = useState("");

  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res.success && res.data) {
        setHasPin(res.data.hasPin);
      }
    });
  }, []);

  const resetForms = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setClearPinValue("");
  };

  const handleChangePin = () => {
    startTransition(async () => {
      const result = await changePin({
        currentPin: hasPin ? currentPin : undefined,
        newPin,
        confirmPin,
      });

      if (result.success) {
        toast.success(hasPin ? "PIN updated successfully" : "PIN set successfully");
        setHasPin(true);
        resetForms();
      } else {
        toast.error(result.error || "Failed to update PIN");
      }
    });
  };

  const handleClearPin = () => {
    if (!confirm("Remove your PIN? You will not be able to use PIN-only sign-in until you set a new one.")) {
      return;
    }

    startTransition(async () => {
      const result = await clearMyPin(clearPinValue);

      if (result.success) {
        toast.success("PIN removed");
        setHasPin(false);
        resetForms();
      } else {
        toast.error(result.error || "Failed to remove PIN");
      }
    });
  };

  const canSubmit =
    newPin.length === 4 &&
    confirmPin.length === 4 &&
    (!hasPin || currentPin.length === 4);

  if (hasPin === null) {
    return (
      <ContentCard>
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard padding="none">
      <div className="px-4 py-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-[#16A34A]" />
          <h3 className="text-base font-semibold text-[#222831]">
            {hasPin ? "Change PIN" : "Set PIN"}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {hasPin
            ? "Update your 4-digit PIN for quick sign-in on shared devices"
            : "Create a 4-digit PIN to sign in without your email password"}
        </p>
      </div>
      <div className="px-4 pb-4 pt-4 space-y-4">
        {hasPin ? (
          <div className="space-y-1.5">
            <Label className="text-xs">Current PIN</Label>
            <PinInput
              idPrefix="current-pin"
              value={currentPin}
              onChange={setCurrentPin}
              disabled={isPending}
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label className="text-xs">{hasPin ? "New PIN" : "PIN"}</Label>
          <PinInput
            idPrefix="new-pin"
            value={newPin}
            onChange={setNewPin}
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Confirm PIN</Label>
          <PinInput
            idPrefix="confirm-pin"
            value={confirmPin}
            onChange={setConfirmPin}
            disabled={isPending}
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button className={dashboardPrimaryButtonClass} onClick={handleChangePin} disabled={isPending || !canSubmit}>
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            {hasPin ? "Update PIN" : "Set PIN"}
          </Button>
        </div>

        {hasPin ? (
          <div className="space-y-2 pt-2 border-t border-border/60">
            <p className="text-xs text-muted-foreground">Remove PIN-only sign-in</p>
            <PinInput
              idPrefix="clear-pin"
              value={clearPinValue}
              onChange={setClearPinValue}
              disabled={isPending}
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={handleClearPin}
                disabled={isPending || clearPinValue.length !== 4}
              >
                Remove PIN
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </ContentCard>
  );
}
