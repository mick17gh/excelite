"use client";

import { useEffect, useState } from "react";
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
import { deleteSupplier, updateSupplier } from "@/lib/actions/inventory";
import {
  SUPPLIER_CONSISTENCY,
  SUPPLIER_CORE_CATEGORIES,
  SUPPLIER_LEAD_TIMES,
  SUPPLIER_PAYMENT_METHODS,
  SUPPLIER_QUALITY_RATINGS,
} from "./supplier-form-options";

interface SupplierEditData {
  id: string;
  name: string;
  code: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  leadTime: string | null;
  consistency: string | null;
  coreCategory: string | null;
  specialization: string | null;
  paymentMethod: string | null;
  qualityRating: string | null;
  specialNotes: string | null;
  tags: string[];
  isActive: boolean;
}

interface EditSupplierDialogProps {
  supplier: SupplierEditData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function EditSupplierDialog({
  supplier,
  open,
  onOpenChange,
  onUpdated,
}: EditSupplierDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
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

  useEffect(() => {
    if (!supplier) return;
    setName(supplier.name);
    setContactName(supplier.contactName || "");
    setEmail(supplier.email || "");
    setPhone(supplier.phone || "");
    setAddress(supplier.address || "");
    setLeadTime(supplier.leadTime || "none");
    setConsistency(supplier.consistency || "none");
    setCoreCategory(supplier.coreCategory || "none");
    setPaymentMethod(supplier.paymentMethod || "none");
    setQualityRating(supplier.qualityRating || "none");
    setSpecialization(supplier.specialization || "");
    setTags((supplier.tags || []).join(", "));
    setSpecialNotes(supplier.specialNotes || "");
  }, [supplier]);

  if (!supplier) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    setIsSubmitting(true);
    const result = await updateSupplier({
      id: supplier.id,
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      leadTime: leadTime === "none" ? null : (leadTime as never),
      consistency: consistency === "none" ? null : (consistency as never),
      coreCategory: coreCategory === "none" ? null : (coreCategory as never),
      paymentMethod: paymentMethod === "none" ? null : (paymentMethod as never),
      qualityRating: qualityRating === "none" ? null : (qualityRating as never),
      specialization: specialization.trim() || undefined,
      tags: tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      specialNotes: specialNotes.trim() || undefined,
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error || "Failed to update supplier");
      return;
    }
    toast.success("Supplier updated");
    onOpenChange(false);
    onUpdated?.();
  };

  const handleDeactivate = async () => {
    setIsSubmitting(true);
    const result = await deleteSupplier(supplier.id);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error || "Failed to deactivate supplier");
      return;
    }
    toast.success("Supplier deactivated");
    onOpenChange(false);
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Supplier</DialogTitle>
          <DialogDescription>Update supplier profile, terms, and notes.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input value={supplier.code} disabled />
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
        <DialogFooter className="justify-between">
          <Button variant="destructive" onClick={handleDeactivate} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deactivate
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
