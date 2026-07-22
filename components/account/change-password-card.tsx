"use client";

import { useState, useTransition } from "react";
import { ContentCard } from "@/components/dashboard/content-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changePassword } from "@/lib/actions/settings";
import { dashboardPrimaryButtonClass } from "@/components/dashboard/dashboard-theme";

export function ChangePasswordCard() {
  const [isPending, startTransition] = useTransition();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    startTransition(async () => {
      const result = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (result.success) {
        toast.success("Password changed successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        toast.error(result.error || "Failed to change password");
      }
    });
  };

  return (
    <ContentCard padding="none">
      <div className="px-4 py-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-[#16A34A]" />
          <h3 className="text-base font-semibold text-[#222831]">Change Password</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Update your password to keep your account secure
        </p>
      </div>
      <div className="px-4 pb-4 pt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="current-password" className="text-xs">
            Current Password
          </Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
            }
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password" className="text-xs">
            New Password
          </Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, newPassword: e.target.value })
            }
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-xs">
            Confirm New Password
          </Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={passwordForm.confirmPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
            }
            className="h-10 rounded-xl"
          />
        </div>
        <div className="flex justify-end">
          <Button
            className={dashboardPrimaryButtonClass}
            onClick={handleChangePassword}
            disabled={
              isPending ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword
            }
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Update Password
          </Button>
        </div>
      </div>
    </ContentCard>
  );
}
