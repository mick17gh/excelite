"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { getAllCurrencies, CurrencyCode } from "@/lib/currency";
import {
  createBranch,
  updateBranch,
  setTarget,
  getBranchOnlineStoreEditContext,
} from "@/lib/actions/branches";

const currencies = getAllCurrencies();

const countries = [
  { code: "GH", name: "Ghana" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
];

const timezones = [
  { value: "Africa/Accra", label: "Africa/Accra (GMT)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST)" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
];

// Add Branch Form
interface AddBranchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBranchForm({ open, onOpenChange }: AddBranchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "GH",
    currency: "GHS" as CurrencyCode,
    phone: "",
    email: "",
    timezone: "Africa/Accra",
    openingDate: format(new Date(), "yyyy-MM-dd"),
    requiredStaff: "5",
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createBranch({
        name: formData.name,
        code: formData.code,
        address: formData.address,
        city: formData.city,
        state: formData.state || undefined,
        country: formData.country,
        currency: formData.currency,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        timezone: formData.timezone,
        openingDate: formData.openingDate ? new Date(formData.openingDate) : undefined,
        requiredStaff: parseInt(formData.requiredStaff) || 5,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast.success("Branch created successfully");
        onOpenChange(false);
        setFormData({
          name: "",
          code: "",
          address: "",
          city: "",
          state: "",
          country: "GH",
          currency: "GHS" as CurrencyCode,
          phone: "",
          email: "",
          timezone: "Africa/Accra",
          openingDate: format(new Date(), "yyyy-MM-dd"),
          requiredStaff: "5",
          isActive: true,
        });
      } else {
        toast.error(result.error || "Failed to create branch");
      }
    } catch (error) {
      console.error("Error creating branch:", error);
      toast.error("Failed to create branch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Branch</DialogTitle>
          <DialogDescription>
            Create a new restaurant branch location
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Branch Name</Label>
                <Input
                  id="name"
                  placeholder="Osu"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Branch Code</Label>
                <Input
                  id="code"
                  placeholder="DT-001"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="15 Oxford Street"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Accra"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="GA"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value as CurrencyCode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.code} - {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+233 20 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="osu@excelite.app"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="openingDate">Opening Date</Label>
                <Input
                  id="openingDate"
                  type="date"
                  value={formData.openingDate}
                  onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="requiredStaff">Required Staff</Label>
                <Input
                  id="requiredStaff"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.requiredStaff}
                  onChange={(e) => setFormData({ ...formData, requiredStaff: e.target.value })}
                  placeholder="5"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Branch is operational and accepting transactions
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Branch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Branch Form
interface EditBranchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgTableManagementEnabled?: boolean;
  branch: {
    id: string;
    name: string;
    code: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
    email?: string | null;
    requiredStaff?: number;
    isActive: boolean;
    onlineStoreVisible?: boolean;
    blockSalesWhenOutOfStock?: boolean | null;
    tableServiceEnabled?: boolean;
  } | null;
}

type StockPolicyOverride = "inherit" | "block" | "allow";

function stockPolicyFromBranch(value: boolean | null | undefined): StockPolicyOverride {
  if (value === true) return "block";
  if (value === false) return "allow";
  return "inherit";
}

function stockPolicyToBranch(value: StockPolicyOverride): boolean | null {
  if (value === "block") return true;
  if (value === "allow") return false;
  return null;
}

export function EditBranchForm({
  open,
  onOpenChange,
  orgTableManagementEnabled = false,
  branch,
}: EditBranchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnlineStoreToggle, setShowOnlineStoreToggle] = useState(false);
  const [formData, setFormData] = useState({
    name: branch?.name || "",
    code: branch?.code || "",
    address: branch?.address || "",
    city: branch?.city || "",
    state: branch?.state || "",
    phone: branch?.phone || "",
    email: branch?.email || "",
    requiredStaff: branch?.requiredStaff?.toString() || "5",
    isActive: branch?.isActive ?? true,
    onlineStoreVisible: branch?.onlineStoreVisible ?? false,
    tableServiceEnabled: branch?.tableServiceEnabled ?? false,
  });
  const [stockPolicyOverride, setStockPolicyOverride] = useState<StockPolicyOverride>("inherit");

  useEffect(() => {
    if (!open || !branch?.id) return;

    setFormData({
      name: branch.name || "",
      code: branch.code || "",
      address: branch.address || "",
      city: branch.city || "",
      state: branch.state || "",
      phone: branch.phone || "",
      email: branch.email || "",
      requiredStaff: branch.requiredStaff?.toString() || "5",
      isActive: branch.isActive ?? true,
      onlineStoreVisible: branch.onlineStoreVisible ?? false,
      tableServiceEnabled: branch.tableServiceEnabled ?? false,
    });
    setStockPolicyOverride(stockPolicyFromBranch(branch.blockSalesWhenOutOfStock));

    void (async () => {
      const ctx = await getBranchOnlineStoreEditContext(branch.id);
      setShowOnlineStoreToggle(Boolean(ctx.data?.showOnlineStoreToggle));
      if (ctx.data?.onlineStoreVisible !== undefined) {
        setFormData((prev) => ({
          ...prev,
          onlineStoreVisible: ctx.data!.onlineStoreVisible,
        }));
      }
    })();
  }, [open, branch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await updateBranch({
        id: branch!.id,
        name: formData.name,
        code: formData.code,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        requiredStaff: parseInt(formData.requiredStaff) || 5,
        isActive: formData.isActive,
        ...(showOnlineStoreToggle
          ? { onlineStoreVisible: formData.isActive ? formData.onlineStoreVisible : false }
          : {}),
        blockSalesWhenOutOfStock: stockPolicyToBranch(stockPolicyOverride),
        ...(orgTableManagementEnabled
          ? { tableServiceEnabled: formData.tableServiceEnabled }
          : {}),
      });

      if (result.success) {
        const linked = Boolean(
          (result.data as { organizationLinked?: boolean } | undefined)?.organizationLinked
        );
        toast.success(
          linked
            ? "Branch updated and linked to your organization"
            : "Branch updated successfully"
        );
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to update branch");
      }
    } catch (error) {
      console.error("Error updating branch:", error);
      toast.error("Failed to update branch");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!branch) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[500px]">
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6">
          <DialogTitle>Edit Branch</DialogTitle>
          <DialogDescription>
            Update branch details for {branch.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Branch Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Branch Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="requiredStaff">Required Staff</Label>
                <Input
                  id="requiredStaff"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.requiredStaff}
                  onChange={(e) => setFormData({ ...formData, requiredStaff: e.target.value })}
                  placeholder="5"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Branch is operational
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    isActive: checked,
                    onlineStoreVisible: checked ? formData.onlineStoreVisible : false,
                  })
                }
              />
            </div>

            {showOnlineStoreToggle && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Show on online store</Label>
                  <p className="text-sm text-muted-foreground">
                    Include this branch on the online ordering checkout
                  </p>
                </div>
                <Switch
                  checked={formData.onlineStoreVisible}
                  disabled={!formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, onlineStoreVisible: checked })
                  }
                />
              </div>
            )}

            {orgTableManagementEnabled && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Table service at this branch</Label>
                  <p className="text-sm text-muted-foreground">
                    When on, POS dine-in requires seating at a table for this branch
                  </p>
                </div>
                <Switch
                  checked={formData.tableServiceEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, tableServiceEnabled: checked })
                  }
                />
              </div>
            )}

            <div className="grid gap-2 rounded-lg border p-4">
              <Label htmlFor="stockPolicy">Out-of-stock sales</Label>
              <p className="text-sm text-muted-foreground">
                Override organization default for blocking sales when ingredients are short
              </p>
              <Select
                value={stockPolicyOverride}
                onValueChange={(v) => setStockPolicyOverride(v as StockPolicyOverride)}
              >
                <SelectTrigger id="stockPolicy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Inherit organization setting</SelectItem>
                  <SelectItem value="block">Block sales when out of stock</SelectItem>
                  <SelectItem value="allow">Allow sales (may go negative)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Branch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Set Branch Target Form
interface SetTargetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Array<{ id: string; name: string }>;
}

export function SetTargetForm({ open, onOpenChange, branches }: SetTargetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    branchId: "",
    targetType: "REVENUE",
    period: "MONTHLY",
    targetValue: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await setTarget({
        branchId: formData.branchId,
        targetType: formData.targetType,
        period: formData.period,
        targetValue: parseFloat(formData.targetValue),
        notes: formData.notes || undefined,
      });

      if (result.success) {
        toast.success("Target set successfully");
        onOpenChange(false);
        setFormData({
          branchId: "",
          targetType: "REVENUE",
          period: "MONTHLY",
          targetValue: "",
          notes: "",
        });
      } else {
        toast.error(result.error || "Failed to set target");
      }
    } catch (error) {
      console.error("Error setting target:", error);
      toast.error("Failed to set target");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Branch Target</DialogTitle>
          <DialogDescription>
            Define performance targets for a branch
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="branch">Branch</Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="targetType">Target Type</Label>
                <Select
                  value={formData.targetType}
                  onValueChange={(value) => setFormData({ ...formData, targetType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REVENUE">Revenue</SelectItem>
                    <SelectItem value="TRANSACTIONS">Transactions</SelectItem>
                    <SelectItem value="AVG_TICKET">Avg Ticket</SelectItem>
                    <SelectItem value="CUSTOMERS">Customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="period">Period</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value) => setFormData({ ...formData, period: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="targetValue">Target Value (GH₵)</Label>
              <Input
                id="targetValue"
                type="number"
                step="0.01"
                placeholder="100000"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional context for this target..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set Target
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
