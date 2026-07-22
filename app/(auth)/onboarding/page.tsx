import { Suspense } from "react";
import { OnboardingContent } from "@/components/onboarding/onboarding-content";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = {
  title: "Get Started",
  description: "Set up your shop on Excelite POS",
};

export default async function OnboardingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const org = await db.organization.findFirst();
  if (org) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden excelite-hero-bg">
      <div className="excelite-orb excelite-orb-green w-[360px] h-[360px] -top-24 -right-24 animate-excelite-pulse-ring opacity-70" />
      <div className="excelite-orb excelite-orb-green w-[240px] h-[240px] bottom-8 left-[-60px] animate-excelite-float-slow opacity-50" />
      <div className="excelite-orb excelite-orb-charcoal w-[180px] h-[180px] top-1/3 right-1/4 animate-excelite-float opacity-30" />

      <Suspense fallback={<OnboardingLoadingSkeleton />}>
        <OnboardingContent user={session.user} />
      </Suspense>
    </div>
  );
}

function OnboardingLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-[560px] space-y-6">
        <div className="h-10 w-48 mx-auto animate-pulse rounded-lg bg-muted" />
        <div className="h-6 w-64 mx-auto animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-2xl bg-muted/60 border" />
      </div>
    </div>
  );
}
