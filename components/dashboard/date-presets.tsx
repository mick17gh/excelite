"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { subDays, subWeeks, subMonths, startOfWeek, startOfMonth, startOfYear } from "date-fns";

interface DatePresetsProps {
  onSelect: (range: DateRange) => void;
  currentRange?: DateRange;
}

const presets = [
  {
    label: "Today",
    range: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  {
    label: "Yesterday",
    range: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    },
  },
  {
    label: "Last 7 Days",
    range: () => {
      const today = new Date();
      return { from: subDays(today, 6), to: today };
    },
  },
  {
    label: "Last 30 Days",
    range: () => {
      const today = new Date();
      return { from: subDays(today, 29), to: today };
    },
  },
  {
    label: "This Week",
    range: () => {
      const today = new Date();
      return { from: startOfWeek(today), to: today };
    },
  },
  {
    label: "Last Week",
    range: () => {
      const today = new Date();
      const lastWeekStart = startOfWeek(subWeeks(today, 1));
      const lastWeekEnd = subDays(startOfWeek(today), 1);
      return { from: lastWeekStart, to: lastWeekEnd };
    },
  },
  {
    label: "This Month",
    range: () => {
      const today = new Date();
      return { from: startOfMonth(today), to: today };
    },
  },
  {
    label: "Last Month",
    range: () => {
      const today = new Date();
      const lastMonthStart = startOfMonth(subMonths(today, 1));
      const lastMonthEnd = subDays(startOfMonth(today), 1);
      return { from: lastMonthStart, to: lastMonthEnd };
    },
  },
  {
    label: "This Year",
    range: () => {
      const today = new Date();
      return { from: startOfYear(today), to: today };
    },
  },
];

export function DatePresets({ onSelect, currentRange }: DatePresetsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="mr-2 h-4 w-4" />
          Presets
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {presets.map((preset) => (
          <DropdownMenuItem
            key={preset.label}
            onClick={() => onSelect(preset.range())}
            className="cursor-pointer"
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
