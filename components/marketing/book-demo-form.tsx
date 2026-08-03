"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { submitDemoRequest } from "@/lib/actions/demo-requests";
import { EXCELITE_BRAND } from "@/lib/excelite-config";
import { CheckCircle2, Loader2 } from "lucide-react";

const DEMO_INTERESTS = [
  "POS & Taking Orders",
  "Sales & Business Reports",
  "Stock Management",
  "Orders & Payments",
  "How Excelite Works Overall",
  "Not Sure — Show Me Around",
] as const;

export function BookDemoForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [contactPreference, setContactPreference] = useState<"WhatsApp" | "Phone Call">(
    "WhatsApp",
  );
  const [interests, setInterests] = useState<string[]>([]);

  const toggleInterest = (interest: string, checked: boolean) => {
    setInterests((prev) =>
      checked ? [...prev, interest] : prev.filter((item) => item !== interest),
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitDemoRequest({
        name,
        businessName,
        phone,
        businessType,
        preferredDate,
        contactPreference,
        interests,
      });

      if (!result.success) {
        setError(result.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-[#22C55E]/20 bg-[#22C55E]/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#22C55E]/15">
          <CheckCircle2 className="h-6 w-6 text-[#16A34A]" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Request received</h2>
        <p className="text-[#222831]/70 leading-relaxed mb-6">
          Your demo request has been received. A member of the Excelite team will
          contact you to confirm the date and time.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
          <Button
            asChild
            className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
          >
            <a
              href={EXCELITE_BRAND.supportWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat on WhatsApp
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Your Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your full name"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            placeholder="Your business name"
            className="h-11"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone / WhatsApp Number *</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="+233..."
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessType">Business Type *</Label>
          <Input
            id="businessType"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            required
            placeholder="e.g. Café, Grocery, Fast food"
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferredDate">Preferred Demo Date *</Label>
        <Input
          id="preferredDate"
          type="date"
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
          required
          className="h-11"
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      <div className="space-y-3">
        <Label>How would you prefer we contact you? *</Label>
        <RadioGroup
          value={contactPreference}
          onValueChange={(value) =>
            setContactPreference(value as "WhatsApp" | "Phone Call")
          }
          className="flex flex-col sm:flex-row gap-3"
        >
          <label className="flex items-center gap-2 rounded-xl border border-[#222831]/10 px-4 py-3 cursor-pointer hover:bg-[#22C55E]/5">
            <RadioGroupItem value="WhatsApp" id="contact-whatsapp" />
            <span className="text-sm">WhatsApp</span>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[#222831]/10 px-4 py-3 cursor-pointer hover:bg-[#22C55E]/5">
            <RadioGroupItem value="Phone Call" id="contact-phone" />
            <span className="text-sm">Phone Call</span>
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label>What would you like to see in the demo? (optional)</Label>
        <div className="grid sm:grid-cols-2 gap-3">
          {DEMO_INTERESTS.map((interest) => {
            const checked = interests.includes(interest);
            return (
              <label
                key={interest}
                className="flex items-start gap-2 rounded-xl border border-[#222831]/10 px-3 py-3 cursor-pointer hover:bg-[#22C55E]/5"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    toggleInterest(interest, value === true)
                  }
                  className="mt-0.5"
                />
                <span className="text-sm leading-snug">{interest}</span>
              </label>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-12 bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Booking...
          </>
        ) : (
          "Book My Demo"
        )}
      </Button>
    </form>
  );
}
