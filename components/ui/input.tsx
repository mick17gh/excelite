import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-blue-500 selection:text-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 h-10 w-full min-w-0 rounded-lg border bg-white dark:bg-slate-900/30 px-3 py-2 text-base shadow-sm transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "hover:border-blue-300 dark:hover:border-blue-700",
        className
      )}
      {...props}
    />
  )
}

export { Input }
