"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { checkOnboardingStatus } from "@/lib/actions/onboarding";

export function LoginForm({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<"password" | "pin">("password");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    pin: "",
    rememberMe: false,
  });
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pinDigits = Array.from({ length: 4 }, (_, idx) => formData.pin[idx] || "");

  const setPinAt = (index: number, digit: string) => {
    const next = pinDigits.slice();
    next[index] = digit;
    setFormData({ ...formData, pin: next.join("") });
  };

  const handlePinChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setPinAt(index, digit);
    if (digit && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    const next = Array.from({ length: 4 }, (_, idx) => pasted[idx] || "").join("");
    setFormData({ ...formData, pin: next });
    const focusIndex = Math.min(pasted.length, 4) - 1;
    if (focusIndex >= 0) {
      pinRefs.current[focusIndex]?.focus();
    }
  };

  const switchLoginMode = (mode: "password" | "pin") => {
    setLoginMode(mode);
    if (mode === "pin") {
      setFormData((prev) => ({
        ...prev,
        email: "",
        password: "",
      }));
      setShowPassword(false);
      pinRefs.current[0]?.focus();
      return;
    }
    setFormData((prev) => ({
      ...prev,
      pin: "",
    }));
  };

  const getPostLoginRoute = async (role?: string | null) => {
    const onboarding = await checkOnboardingStatus();
    if (!onboarding.data?.completed) {
      return "/onboarding";
    }
    if (role === "WAITER" || role === "STAFF" || role === "CALL_CENTER") {
      return "/pos";
    }
    return "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (loginMode === "pin") {
        const response = await fetch("/api/auth/pin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin: formData.pin,
            rememberMe: formData.rememberMe,
          }),
        });
        if (!response.ok) {
          toast.error("Invalid PIN");
          return;
        }
        const payload = (await response.json().catch(() => null)) as
          | { user?: { role?: string | null } }
          | null;
        const targetRoute = await getPostLoginRoute(payload?.user?.role);
        window.location.assign(targetRoute);
        return;
      } else {
        const result = await authClient.signIn.email({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
        });

        if (result.error) {
          toast.error(result.error.message || "Invalid credentials");
          return;
        }
        const role = (result.data as { user?: { role?: string | null } } | undefined)?.user
          ?.role;
        const targetRoute = await getPostLoginRoute(role);

        toast.success("Welcome back!");
        // Full navigation so Set-Cookie is applied before the next server render
        window.location.assign(targetRoute);
        return;
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = variant === "dark";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div
        className={`grid grid-cols-2 gap-1.5 rounded-xl p-1 login-mode-toggle ${
          isDark ? "" : "bg-[#222831]/5"
        }`}
      >
        <Button
          type="button"
          variant={loginMode === "password" ? "default" : "ghost"}
          className={`h-9 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
            loginMode === "password"
              ? "bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-sm"
              : isDark
                ? "login-mode-inactive hover:bg-white/10 text-white/60"
                : "hover:bg-white/60"
          }`}
          onClick={() => switchLoginMode("password")}
          disabled={isLoading}
        >
          Email + Password
        </Button>
        <Button
          type="button"
          variant={loginMode === "pin" ? "default" : "ghost"}
          className={`h-9 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
            loginMode === "pin"
              ? "bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-sm"
              : isDark
                ? "login-mode-inactive hover:bg-white/10 text-white/60"
                : "hover:bg-white/60"
          }`}
          onClick={() => switchLoginMode("pin")}
          disabled={isLoading}
        >
          PIN Only
        </Button>
      </div>

          {loginMode === "password" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={isLoading}
                  className={`h-11 focus-visible:ring-[#22C55E]/30 ${
                    isDark
                      ? "bg-white/8 border-white/15 text-white placeholder:text-white/35"
                      : "bg-white/70 border-[#222831]/10"
                  }`}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className={`text-sm hover:underline font-medium ${
                      isDark
                        ? "text-[#4ADE80] hover:text-[#22C55E]"
                        : "text-[#22C55E] hover:text-[#16A34A]"
                    }`}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    disabled={isLoading}
                    className={`h-11 focus-visible:ring-[#22C55E]/30 pr-10 ${
                      isDark
                        ? "bg-white/8 border-white/15 text-white placeholder:text-white/35"
                        : "bg-white/70 border-[#222831]/10"
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="pin">4-digit PIN</Label>
              <div className="flex items-center gap-2">
                {pinDigits.map((digit, index) => (
                  <Input
                    key={`pin-${index}`}
                    id={index === 0 ? "pin" : undefined}
                    ref={(el) => {
                      pinRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className={`h-12 text-center text-lg tracking-widest focus-visible:ring-[#22C55E]/30 ${
                      isDark
                        ? "bg-white/8 border-white/15 text-white"
                        : "bg-white/70 border-[#222831]/10"
                    }`}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    onPaste={handlePinPaste}
                    maxLength={1}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={formData.rememberMe}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, rememberMe: checked as boolean })
              }
            />
            <Label htmlFor="remember" className={`text-sm font-normal ${isDark ? "text-white/70" : ""}`}>
              Remember me for 30 days
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium shadow-md shadow-[#22C55E]/20 transition-all duration-200 hover:shadow-lg hover:shadow-[#22C55E]/30 cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
  );
}
