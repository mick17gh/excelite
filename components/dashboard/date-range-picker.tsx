"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  className?: string;
}

const presets = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This month", days: -1 },
  { label: "Last month", days: -2 },
];

export function DateRangePicker({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const handlePresetChange = (value: string) => {
    const days = parseInt(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (days === 0) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      onDateChange({ from: start, to: today });
    } else if (days === 1) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      onDateChange({ from: yesterday, to: yesterdayEnd });
    } else if (days === -1) {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      onDateChange({ from: start, to: today });
    } else if (days === -2) {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      onDateChange({ from: start, to: end });
    } else {
      const start = new Date();
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0);
      onDateChange({ from: start, to: today });
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem
              key={preset.label}
              value={preset.days.toString()}
            >
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
