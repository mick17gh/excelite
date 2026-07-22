"use client";

import { ChangeEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  X,
  Monitor,
  LayoutDashboard,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { EXCELITE_BRAND } from "@/lib/excelite-config";
import { cn } from "@/lib/utils";

interface OnboardingContentProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const STEPS = [
  { number: 1, label: "Business" },
  { number: 2, label: "Branch" },
  { number: 3, label: "Ready" },
] as const;

export function OnboardingContent({ user }: OnboardingContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [isComplete, setIsComplete] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("RETAIL");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);

  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchEmail, setBranchEmail] = useState("");

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    setSelectedLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    setSelectedLogoFile(null);
    setLogoPreview(null);
  };

  const goNext = () => {
    if (step === 1 && !orgName.trim()) {
      toast.error("Please enter your business name");
      return;
    }
    if (step === 2 && (!branchName.trim() || !branchCode.trim())) {
      toast.error("Please complete the branch details");
      return;
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = () => {
    if (!orgName.trim()) {
      toast.error("Please enter your business name");
      return;
    }
    if (!branchName.trim() || !branchCode.trim()) {
      toast.error("Please complete the branch details");
      return;
    }

    startTransition(async () => {
      let uploadedLogoUrl = "";

      try {
        if (selectedLogoFile) {
          const uploadFormData = new FormData();
          uploadFormData.append("file", selectedLogoFile);
          uploadFormData.append("folder", "organization");

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: uploadFormData,
          });

          if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.json();
            throw new Error(uploadError.error || "Failed to upload logo");
          }

          const uploadData = await uploadResponse.json();
          uploadedLogoUrl = uploadData.url;
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to upload logo");
        return;
      }

      const result = await completeOnboarding({
        organization: {
          name: orgName.trim(),
          tableManagementEnabled: false,
          storeLogoUrl: uploadedLogoUrl || undefined,
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
        setIsComplete(true);
        toast.success("You're all set!", {
          description: "Your shop is ready to start selling",
        });
      } else {
        toast.error(result.error || "Failed to complete setup");
      }
    });
  };

  if (isComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-[560px] text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
          <div className="excelite-glass rounded-2xl border border-[#22C55E]/20 p-8 md:p-10 shadow-lg shadow-[#22C55E]/10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#22C55E]/10">
              <CheckCircle2 className="h-9 w-9 text-[#16A34A]" />
            </div>
            <h2 className="text-2xl font-bold text-[#222831] mb-2">You&apos;re ready to sell!</h2>
            <p className="text-[#222831]/70 mb-8">
              {orgName} is set up. Add products, open the POS, or explore your dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-md shadow-[#22C55E]/20"
              >
                <Link href="/pos">
                  <Monitor className="mr-2 h-4 w-4" />
                  Open POS
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-[560px]">
        <div className="text-center mb-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image
              src={EXCELITE_BRAND.logo}
              alt={`${EXCELITE_BRAND.name} logo`}
              width={44}
              height={44}
              className="rounded-xl shadow-md"
            />
            <span className="text-2xl font-bold text-[#222831]">{EXCELITE_BRAND.shortName}</span>
          </div>
          <h1 className="text-xl font-semibold text-[#222831] mb-1">
            Welcome, {user.name.split(" ")[0]}!
          </h1>
          <p className="text-sm text-[#222831]/60">
            Set up your shop in three quick steps
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center gap-2">
              <StepIndicator
                number={s.number}
                label={s.label}
                active={step === s.number}
                completed={step > s.number}
              />
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px w-8 sm:w-12 transition-colors",
                    step > s.number ? "bg-[#22C55E]" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div
          key={step}
          className="excelite-glass rounded-2xl border border-white/60 shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300"
        >
          {step === 1 && (
            <div className="p-6 md:p-8 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#222831] flex items-center gap-2">
                  <Store className="h-5 w-5 text-[#16A34A]" />
                  Your business
                </h2>
                <p className="text-sm text-[#222831]/60 mt-1">
                  Tell us about your shop so we can personalize your setup
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgName">Business name *</Label>
                <Input
                  id="orgName"
                  placeholder="e.g., Sunrise General Store"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Business type</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger id="industry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RETAIL">Retail shop</SelectItem>
                    <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                    <SelectItem value="CAFE">Café</SelectItem>
                    <SelectItem value="FAST_FOOD">Fast food</SelectItem>
                    <SelectItem value="BAKERY">Bakery</SelectItem>
                    <SelectItem value="CATERING">Catering</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Logo (optional)</Label>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
                    {logoPreview ? (
                      <>
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-0.5 right-0.5 h-5 w-5"
                          onClick={clearLogo}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      id="org-logo-upload"
                    />
                    <Label
                      htmlFor="org-logo-upload"
                      className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <Upload className="h-4 w-4" />
                      Upload logo
                    </Label>
                    <p className="text-xs text-muted-foreground">Max 5MB. JPG, PNG, or WebP.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={goNext} disabled={!orgName.trim()}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 md:p-8 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#222831] flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#16A34A]" />
                  First location
                </h2>
                <p className="text-sm text-[#222831]/60 mt-1">
                  Where will you be selling from? You can add more branches later.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branchName">Location name *</Label>
                  <Input
                    id="branchName"
                    placeholder="e.g., Main Shop"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchCode">Short code *</Label>
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
                    placeholder="shop@example.com"
                    value={branchEmail}
                    onChange={(e) => setBranchEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={goBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!branchName.trim() || !branchCode.trim()}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 md:p-8 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#222831] flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
                  Ready to go
                </h2>
                <p className="text-sm text-[#222831]/60 mt-1">
                  Review your details, then start selling
                </p>
              </div>

              <div className="rounded-xl border bg-background/60 divide-y text-sm">
                <div className="flex items-start gap-3 p-4">
                  <Building2 className="h-4 w-4 text-[#16A34A] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-[#222831]">{orgName}</p>
                    <p className="text-muted-foreground capitalize">
                      {industry.toLowerCase().replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4">
                  <MapPin className="h-4 w-4 text-[#16A34A] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-[#222831]">
                      {branchName}{" "}
                      <span className="text-muted-foreground font-normal">({branchCode})</span>
                    </p>
                    {(branchAddress || branchCity) && (
                      <p className="text-muted-foreground">
                        {[branchAddress, branchCity].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {["POS checkout", "Product catalog", "Inventory", "Daily reports"].map(
                  (feature) => (
                    <span
                      key={feature}
                      className="px-2.5 py-1 rounded-full bg-[#22C55E]/10 text-[#16A34A] text-xs font-medium"
                    >
                      {feature}
                    </span>
                  ),
                )}
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={goBack} disabled={isPending}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete setup
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
          completed && "border-[#22C55E] bg-[#22C55E] text-white",
          active && !completed && "border-[#22C55E] bg-[#22C55E] text-white",
          !active && !completed && "border-muted-foreground/30 text-muted-foreground",
        )}
      >
        {completed ? <CheckCircle2 className="h-4 w-4" /> : number}
      </div>
      <span
        className={cn(
          "text-xs font-medium hidden sm:block",
          active || completed ? "text-[#222831]" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}
