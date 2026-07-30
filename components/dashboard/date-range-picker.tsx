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

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  className?: string;
}

/** Inclusive calendar-day bounds: from 00:00:00.000 → to 23:59:59.999 */
export function normalizeInclusiveDateRange(
  range: DateRange | undefined,
): DateRange | undefined {
  if (!range?.from) return range;
  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);
  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function sameCalendarDay(a?: Date, b?: Date) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function sameRange(a?: DateRange, b?: DateRange) {
  if (!a?.from && !b?.from) return true;
  if (!a?.from || !b?.from) return false;
  return sameCalendarDay(a.from, b.from) && sameCalendarDay(a.to ?? a.from, b.to ?? b.from);
}

export function DateRangePicker({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(date);

  React.useEffect(() => {
    if (!open) setDraft(date);
  }, [date, open]);

  const commit = (range: DateRange | undefined) => {
    const normalized = range?.from ? normalizeInclusiveDateRange(range) : range;
    if (sameRange(normalized, date)) return;
    onDateChange(normalized);
  };

  const handleSelect = (next: DateRange | undefined) => {
    setDraft(next);
  };

  const handleApply = () => {
    if (!draft?.from) return;
    commit({ from: draft.from, to: draft.to ?? draft.from });
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(date);
      setOpen(true);
      return;
    }

    // Close without applying pending draft changes.
    setDraft(date);
    setOpen(false);
  };

  const display = open ? draft ?? date : date;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !display && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {display?.from ? (
              display.to && !sameCalendarDay(display.from, display.to) ? (
                <>
                  {format(display.from, "LLL dd, y")} -{" "}
                  {format(display.to, "LLL dd, y")}
                </>
              ) : (
                format(display.from, "LLL dd, y")
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
            defaultMonth={display?.from}
            selected={draft}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
          <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!draft?.from}
              onClick={handleApply}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
