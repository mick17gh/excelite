"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createSupplier } from "@/lib/actions/inventory";
import {
  SUPPLIER_CONSISTENCY,
  SUPPLIER_CORE_CATEGORIES,
  SUPPLIER_LEAD_TIMES,
  SUPPLIER_PAYMENT_METHODS,
  SUPPLIER_QUALITY_RATINGS,
} from "./supplier-form-options";

interface CreateSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateSupplierDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateSupplierDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [leadTime, setLeadTime] = useState("none");
  const [consistency, setConsistency] = useState("none");
  const [coreCategory, setCoreCategory] = useState("none");
  const [paymentMethod, setPaymentMethod] = useState("none");
  const [qualityRating, setQualityRating] = useState("none");
  const [specialization, setSpecialization] = useState("");
  const [tags, setTags] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");

  const reset = () => {
    setName("");
    setCode("");
    setContactName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setLeadTime("none");
    setConsistency("none");
    setCoreCategory("none");
    setPaymentMethod("none");
    setQualityRating("none");
    setSpecialization("");
    setTags("");
    setSpecialNotes("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    setIsSubmitting(true);
    const finalCode =
      code.trim() ||
      `${name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    const result = await createSupplier({
      name: name.trim(),
      code: finalCode,
      contactName: contactName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      leadTime: leadTime === "none" ? undefined : (leadTime as never),
      consistency: consistency === "none" ? undefined : (consistency as never),
      coreCategory: coreCategory === "none" ? undefined : (coreCategory as never),
      paymentMethod: paymentMethod === "none" ? undefined : (paymentMethod as never),
      qualityRating: qualityRating === "none" ? undefined : (qualityRating as never),
      specialization: specialization.trim() || undefined,
      tags: tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      specialNotes: specialNotes.trim() || undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error || "Failed to create supplier");
      return;
    }
    toast.success("Supplier created");
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
          <DialogDescription>Create a supplier profile with terms and quality details.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supplier name" />
          </div>
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Auto-generated if blank" />
          </div>
          <div className="grid gap-2">
            <Label>Contact Name</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Lead Time</Label>
            <Select value={leadTime} onValueChange={setLeadTime}>
              <SelectTrigger><SelectValue placeholder="Select lead time" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {SUPPLIER_LEAD_TIMES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Consistency</Label>
            <Select value={consistency} onValueChange={setConsistency}>
              <SelectTrigger><SelectValue placeholder="Select consistency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {SUPPLIER_CONSISTENCY.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Core Category</Label>
            <Select value={coreCategory} onValueChange={setCoreCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {SUPPLIER_CORE_CATEGORIES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {SUPPLIER_PAYMENT_METHODS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Quality Rating</Label>
            <Select value={qualityRating} onValueChange={setQualityRating}>
              <SelectTrigger><SelectValue placeholder="Select quality rating" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {SUPPLIER_QUALITY_RATINGS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Specialization</Label>
            <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Tags (comma-separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Special Notes</Label>
            <Textarea value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Supplier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
