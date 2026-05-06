"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteSupplier, updateSupplier } from "@/lib/actions/inventory";
import { toast } from "sonner";

interface SupplierRow {
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
  lifetimePayments: number;
  isActive: boolean;
}

export function SuppliersContent({ suppliers }: { suppliers: SupplierRow[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SupplierRow | null>(null);

  const filtered = useMemo(() => {
    return suppliers.filter((s) =>
      `${s.name} ${s.code} ${s.contactName || ""}`.toLowerCase().includes(query.toLowerCase()),
    );
  }, [suppliers, query]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search supplier name, code, contact"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      <Card>
        <CardContent className="p-4 space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Lifetime Payments</p>
                  <p className="font-semibold">
                    {s.lifetimePayments.toLocaleString(undefined, { style: "currency", currency: "GHS" })}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(s.tags || []).map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
                {s.specialization ? <Badge variant="secondary">{s.specialization}</Badge> : null}
                {s.leadTime ? <Badge variant="secondary">{s.leadTime.replaceAll("_", " ")}</Badge> : null}
                {s.paymentMethod ? <Badge variant="secondary">{s.paymentMethod.replaceAll("_", " ")}</Badge> : null}
              </div>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={() => setSelected(s)}>Manage</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {selected ? <EditSupplierDialog supplier={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function EditSupplierDialog({ supplier, onClose }: { supplier: SupplierRow; onClose: () => void }) {
  const [name, setName] = useState(supplier.name);
  const [tags, setTags] = useState((supplier.tags || []).join(", "));
  const [specialNotes, setSpecialNotes] = useState(supplier.specialNotes || "");
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    const result = await updateSupplier({
      id: supplier.id,
      name,
      tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
      specialNotes,
    });
    setIsSaving(false);
    if (!result.success) {
      toast.error(result.error || "Failed to save supplier");
      return;
    }
    toast.success("Supplier updated");
    onClose();
  };

  const deactivate = async () => {
    const result = await deleteSupplier(supplier.id);
    if (!result.success) {
      toast.error(result.error || "Failed to deactivate supplier");
      return;
    }
    toast.success("Supplier deactivated");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Supplier</DialogTitle>
          <DialogDescription>Update tags and internal notes</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Tags (comma-separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Special Notes</Label>
            <Textarea value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} rows={4} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="destructive" onClick={deactivate}>Deactivate</Button>
          <Button onClick={save} disabled={isSaving}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
