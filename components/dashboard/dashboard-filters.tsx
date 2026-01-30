"use client";

import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DatePresets } from "@/components/dashboard/date-presets";
import { BranchSelector } from "@/components/dashboard/branch-selector";
import { useBranchRestrictions, filterBranchesForUser } from "@/hooks/use-branch-restrictions";
import { useEffect } from "react";
import { useIsMounted } from "@/hooks/use-is-mounted";

interface Branch {
  id: string;
  name: string;
  code: string;
  currency?: string;
}

interface DashboardFiltersProps {
  branches: Branch[];
  selectedBranches: string[];
  onBranchChange: (branches: string[]) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function DashboardFilters({
  branches,
  selectedBranches,
  onBranchChange,
  dateRange,
  onDateRangeChange,
}: DashboardFiltersProps) {
  const mounted = useIsMounted();
  const { canViewAllBranches, userBranchId, isLoading } = useBranchRestrictions();
  
  // Filter branches based on user permissions
  const availableBranches = filterBranchesForUser(branches, canViewAllBranches, userBranchId);
  
  // Auto-select user's branch if they're restricted
  useEffect(() => {
    if (!isLoading && !canViewAllBranches && userBranchId) {
      // Only set if not already set to the user's branch
      if (selectedBranches.length !== 1 || selectedBranches[0] !== userBranchId) {
        onBranchChange([userBranchId]);
      }
    }
  }, [isLoading, canViewAllBranches, userBranchId, selectedBranches, onBranchChange]);

  // Show consistent placeholder during SSR and initial hydration
  const showRestricted = mounted ? !canViewAllBranches : false;
  const displayBranches = mounted ? availableBranches : branches;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <BranchSelector
        branches={displayBranches}
        selectedBranches={selectedBranches}
        onSelectionChange={onBranchChange}
        className="w-full sm:w-[200px]"
        restrictedToSingleBranch={showRestricted}
      />
      <DateRangePicker
        date={dateRange}
        onDateChange={onDateRangeChange}
        className="w-full sm:w-auto"
      />
      <DatePresets
        onSelect={onDateRangeChange}
        currentRange={dateRange}
      />
    </div>
  );
}
