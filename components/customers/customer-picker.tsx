"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  createCustomer,
  getCustomers,
  type PosCustomerCacheItem,
} from "@/lib/actions/customers";

export type CustomerPickerOption = PosCustomerCacheItem;

export const WALK_IN_CUSTOMER_VALUE = "walk-in";

interface CustomerPickerProps {
  customers: CustomerPickerOption[];
  value?: string;
  onValueChange: (
    value: string,
    customer: CustomerPickerOption | null,
  ) => void;
  offlineRestricted?: boolean;
  allowCreate?: boolean;
  onCustomerCreated?: (customer: CustomerPickerOption) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomerPicker({
  customers,
  value = WALK_IN_CUSTOMER_VALUE,
  onValueChange,
  offlineRestricted = false,
  allowCreate = true,
  onCustomerCreated,
  placeholder = "Select customer...",
  className,
  disabled = false,
}: CustomerPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CustomerPickerOption[]>(customers);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const canCreate = allowCreate && !offlineRestricted;

  useEffect(() => {
    if (!open) {
      setSearch("");
      setShowNewCustomer(false);
      setNewCustName("");
      setNewCustPhone("");
      return;
    }
    if (offlineRestricted) {
      setResults(customers);
    }
  }, [open, offlineRestricted, customers]);

  useEffect(() => {
    if (!open || offlineRestricted) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await getCustomers({
          search: search.trim() || undefined,
          page: 1,
          pageSize: 50,
          activeOnly: true,
        });
        if (cancelled) return;
        setResults(
          (response.data || []).map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
          })),
        );
      } catch {
        if (!cancelled) {
          setResults(customers);
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search, offlineRestricted, customers]);

  const selectedLabel = useMemo(() => {
    if (value === WALK_IN_CUSTOMER_VALUE || !value) return "Walk-in Customer";
    const fromResults = results.find((c) => c.id === value);
    if (fromResults) return `${fromResults.name} (${fromResults.phone})`;
    const fromSeed = customers.find((c) => c.id === value);
    if (fromSeed) return `${fromSeed.name} (${fromSeed.phone})`;
    return placeholder;
  }, [value, results, customers, placeholder]);

  const selectCustomer = (
    nextValue: string,
    customer: CustomerPickerOption | null,
  ) => {
    onValueChange(nextValue, customer);
    setOpen(false);
    setShowNewCustomer(false);
    setSearch("");
  };

  const handleCreateCustomer = async () => {
    if (offlineRestricted) {
      toast.error("Creating customers requires an online connection");
      return;
    }
    if (!newCustName.trim() || !newCustPhone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setIsCreatingCustomer(true);
    try {
      const result = await createCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.data) {
        const created: CustomerPickerOption = {
          id: result.data.id,
          name: result.data.name,
          phone: result.data.phone,
        };
        setResults((prev) => [
          created,
          ...prev.filter((c) => c.id !== created.id),
        ]);
        onCustomerCreated?.(created);
        selectCustomer(created.id, created);
        toast.success(`Customer "${created.name}" selected`);
      }
    } catch {
      toast.error("Failed to create customer");
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-11 font-normal rounded-xl",
            className,
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 rounded-xl" align="start">
        {!showNewCustomer ? (
          <Command shouldFilter={offlineRestricted}>
            <CommandInput
              placeholder="Search customers..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {isSearching ? "Searching..." : "No customer found."}
              </CommandEmpty>
              {canCreate ? (
                <>
                  <CommandGroup>
                    <CommandItem onSelect={() => setShowNewCustomer(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add new customer
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              ) : null}
              <CommandGroup>
                {isSearching ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching customers…
                  </div>
                ) : null}
                <CommandItem
                  value="walk-in"
                  onSelect={() =>
                    selectCustomer(WALK_IN_CUSTOMER_VALUE, null)
                  }
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === WALK_IN_CUSTOMER_VALUE
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  Walk-in customer
                </CommandItem>
                {results.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.name} ${c.phone}`}
                    onSelect={() => selectCustomer(c.id, c)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === c.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{c.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.phone}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">New customer</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setShowNewCustomer(false)}
              >
                Cancel
              </Button>
            </div>
            <Input
              placeholder="Customer name"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              autoFocus
              className="rounded-lg"
            />
            <Input
              placeholder="Phone number"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              className="rounded-lg"
            />
            <Button
              size="sm"
              className="w-full bg-[#22C55E] hover:bg-[#16A34A] rounded-lg"
              onClick={handleCreateCustomer}
              disabled={
                isCreatingCustomer ||
                !newCustName.trim() ||
                !newCustPhone.trim()
              }
            >
              {isCreatingCustomer ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-3 w-3" />
              )}
              {isCreatingCustomer ? "Creating..." : "Create & select"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
