"use client";

import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DatePresets } from "@/components/dashboard/date-presets";
import { BranchSelector } from "@/components/dashboard/branch-selector";

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
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <BranchSelector
        branches={branches}
        selectedBranches={selectedBranches}
        onSelectionChange={onBranchChange}
        className="w-full sm:w-[200px]"
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
