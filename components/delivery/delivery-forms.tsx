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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateDeliveryStatus } from "@/lib/actions/delivery";

interface AssignDriverDialogProps {
  delivery: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    deliveryAddress: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignDriverDialog({ delivery, open, onOpenChange }: AssignDriverDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [comments, setComments] = useState("");

  const handleSubmit = async () => {
    if (!driverName.trim() || !driverPhone.trim()) {
      toast.error("Driver name and phone are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateDeliveryStatus({
        id: delivery.id,
        status: "ASSIGNED",
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        estimatedTime,
        comments: comments.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Driver assigned");
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to assign driver");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Driver</DialogTitle>
          <DialogDescription>
            Assign a driver for order {delivery.orderNumber} to {delivery.deliveryAddress}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Driver Name *</Label>
            <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver name" />
          </div>
          <div className="grid gap-2">
            <Label>Driver Phone *</Label>
            <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+233 XX XXX XXXX" />
          </div>
          <div className="grid gap-2">
            <Label>Estimated Time (minutes)</Label>
            <Input type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(Number(e.target.value))} />
          </div>
          <div className="grid gap-2">
            <Label>Comments</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} placeholder="Driver or delivery notes" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Driver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
