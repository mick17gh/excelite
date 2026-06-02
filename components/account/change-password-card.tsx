"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changePassword } from "@/lib/actions/settings";

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
    <Card className="chart-card rounded-xl">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Key className="h-4 w-4" />
          Change Password
        </CardTitle>
        <CardDescription className="text-xs">
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
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
            className="h-9"
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
            className="h-9"
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
            className="h-9"
          />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleChangePassword}
            disabled={
              isPending ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword
            }
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Update Password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
