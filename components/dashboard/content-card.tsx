import { cn } from "@/lib/utils";

interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
}

export function ContentCard({
  children,
  className,
  padding = "md",
}: ContentCardProps) {
  return (
    <div
      className={cn(
        "content-card rounded-xl border bg-card",
        padding === "sm" && "p-4",
        padding === "md" && "p-0",
        padding === "none" && "p-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
