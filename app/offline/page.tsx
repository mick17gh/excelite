import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline",
  description: "You are offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">You are offline</h1>
        <p className="max-w-md text-muted-foreground text-sm">
          This page is available without a network connection. Reconnect to sync queued POS orders
          and load the latest data.
        </p>
      </div>
      <Button asChild>
        <Link href="/pos">Open POS</Link>
      </Button>
    </div>
  );
}
