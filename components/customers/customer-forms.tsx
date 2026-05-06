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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCustomerDialog({ open, onOpenChange }: CreateCustomerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [customerVibe, setCustomerVibe] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        location: city.trim() || undefined,
        customerVibe: (customerVibe || undefined) as
          | "VIP"
          | "SPECIAL"
          | "FLAGGED"
          | "LARGE_ORDER"
          | "FOB"
          | undefined,
        specialNotes: specialNotes.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Customer created");
        resetForm();
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to create customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setCity("");
    setCustomerVibe("");
    setSpecialNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <DialogDescription>Add a new customer to the CRM</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
          </div>
          <div className="grid gap-2">
            <Label>Phone *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 XX XXX XXXX" />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" />
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
          </div>
          <div className="grid gap-2">
            <Label>Location</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Location" />
          </div>
          <div className="grid gap-2">
            <Label>Customer Vibe</Label>
            <Select value={customerVibe} onValueChange={setCustomerVibe}>
              <SelectTrigger><SelectValue placeholder="Select vibe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="SPECIAL">Special</SelectItem>
                <SelectItem value="FLAGGED">Flagged</SelectItem>
                <SelectItem value="LARGE_ORDER">Large Order</SelectItem>
                <SelectItem value="FOB">FOB</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Special Notes</Label>
            <Textarea value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} placeholder="Internal notes" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditCustomerDialogProps {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    city: string | null;
    location?: string | null;
    customerVibe?: string | null;
    specialNotes?: string | null;
    isActive: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCustomerDialog({ customer, open, onOpenChange }: EditCustomerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email || "");
  const [address, setAddress] = useState(customer.address || "");
  const [city, setCity] = useState(customer.location || customer.city || "");
  const [customerVibe, setCustomerVibe] = useState(customer.customerVibe || "");
  const [specialNotes, setSpecialNotes] = useState(customer.specialNotes || "");

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateCustomer({
        id: customer.id,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        location: city.trim() || undefined,
        customerVibe: (customerVibe || null) as
          | "VIP"
          | "SPECIAL"
          | "FLAGGED"
          | "LARGE_ORDER"
          | "FOB"
          | null,
        specialNotes: specialNotes.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Customer updated");
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to update customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update customer details</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Phone *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Location</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Customer Vibe</Label>
            <Select value={customerVibe} onValueChange={setCustomerVibe}>
              <SelectTrigger><SelectValue placeholder="Select vibe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="SPECIAL">Special</SelectItem>
                <SelectItem value="FLAGGED">Flagged</SelectItem>
                <SelectItem value="LARGE_ORDER">Large Order</SelectItem>
                <SelectItem value="FOB">FOB</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Special Notes</Label>
            <Textarea value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
