"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Phone, Mail, ArrowRight, Loader2, CheckCircle2, UtensilsCrossed } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { useRouter } from "next/navigation";

interface OnboardingContentProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function OnboardingContent({ user }: OnboardingContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);

  // Organization details
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("RESTAURANT");

  // First branch details
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchEmail, setBranchEmail] = useState("");
  const [tableService, setTableService] = useState(false);

  const handleSubmit = () => {
    if (!orgName.trim()) {
      toast.error("Please enter your restaurant name");
      return;
    }

    if (!branchName.trim() || !branchCode.trim()) {
      toast.error("Please complete the branch details");
      return;
    }

    startTransition(async () => {
      const result = await completeOnboarding({
        organization: {
          name: orgName.trim(),
          tableManagementEnabled: tableService,
        },
        branch: {
          name: branchName.trim(),
          code: branchCode.trim().toUpperCase(),
          address: branchAddress.trim(),
          city: branchCity.trim(),
          phone: branchPhone.trim() || undefined,
          email: branchEmail.trim() || undefined,
        },
      });

      if (result.success) {
        toast.success("Welcome to ServStack! 🎉", {
          description: "Your restaurant is all set up",
        });
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to complete setup");
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ServStack
            </h1>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Welcome, {user.name}! 👋</h2>
          <p className="text-muted-foreground">
            Let&apos;s set up your restaurant management system in just a few steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <StepIndicator number={1} label="Organization" active={step === 1} completed={step > 1} />
          <div className="h-px w-12 bg-border" />
          <StepIndicator number={2} label="First Branch" active={step === 2} completed={step > 2} />
        </div>

        {/* Step 1: Organization Details */}
        {step === 1 && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>Tell us about your restaurant business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Restaurant Name *</Label>
                <Input
                  id="orgName"
                  placeholder="e.g., Golden Spoon Restaurant"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry Type</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                    <SelectItem value="CAFE">Café</SelectItem>
                    <SelectItem value="FAST_FOOD">Fast Food</SelectItem>
                    <SelectItem value="BAKERY">Bakery</SelectItem>
                    <SelectItem value="CATERING">Catering</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} disabled={!orgName.trim()}>
                  Next: Branch Setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: First Branch */}
        {step === 2 && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                First Branch Location
              </CardTitle>
              <CardDescription>Set up your first branch or location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branchName">Branch Name *</Label>
                  <Input
                    id="branchName"
                    placeholder="e.g., Main Branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchCode">Branch Code *</Label>
                  <Input
                    id="branchCode"
                    placeholder="e.g., MAIN"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchAddress">Address</Label>
                <Input
                  id="branchAddress"
                  placeholder="Street address"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchCity">City</Label>
                <Input
                  id="branchCity"
                  placeholder="City"
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4" />
                    Table service
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Seat guests at tables, waiter POS, and floor board (can change later in Settings)
                  </p>
                </div>
                <Switch checked={tableService} onCheckedChange={setTableService} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branchPhone">
                    <Phone className="inline h-3 w-3 mr-1" />
                    Phone
                  </Label>
                  <Input
                    id="branchPhone"
                    type="tel"
                    placeholder="+233 XX XXX XXXX"
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchEmail">
                    <Mail className="inline h-3 w-3 mr-1" />
                    Email
                  </Label>
                  <Input
                    id="branchEmail"
                    type="email"
                    placeholder="branch@restaurant.com"
                    value={branchEmail}
                    onChange={(e) => setBranchEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isPending || !branchName.trim() || !branchCode.trim()}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Preview */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">What you&apos;ll get:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["POS System", "Kitchen Display", "Inventory", "Analytics", "Staff Management"].map((feature) => (
              <div key={feature} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ number, label, active, completed }: { number: number; label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors ${
          completed
            ? "border-green-500 bg-green-500 text-white"
            : active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30 text-muted-foreground"
        }`}
      >
        {completed ? <CheckCircle2 className="h-5 w-5" /> : number}
      </div>
      <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}
