"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface BranchSelectorProps {
  branches: Branch[];
  selectedBranches: string[];
  onSelectionChange: (branchIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function BranchSelector({
  branches,
  selectedBranches,
  onSelectionChange,
  placeholder = "Select branches",
  className,
}: BranchSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const toggleBranch = (branchId: string) => {
    if (selectedBranches.includes(branchId)) {
      onSelectionChange(selectedBranches.filter((id) => id !== branchId));
    } else {
      onSelectionChange([...selectedBranches, branchId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(branches.map((b) => b.id));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectedCount = selectedBranches.length;
  const allSelected = selectedCount === branches.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {selectedCount === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : allSelected ? (
              <span>All Branches</span>
            ) : (
              <span>
                {selectedCount} branch{selectedCount !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search branches..." />
          <CommandList>
            <CommandEmpty>No branches found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={allSelected ? clearAll : selectAll}
                className="font-medium"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    allSelected ? "opacity-100" : "opacity-0"
                  )}
                />
                {allSelected ? "Clear all" : "Select all"}
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Branches">
              {branches.map((branch) => (
                <CommandItem
                  key={branch.id}
                  onSelect={() => toggleBranch(branch.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedBranches.includes(branch.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <span>{branch.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {branch.code}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
