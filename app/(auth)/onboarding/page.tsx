import { Suspense } from "react";
import { OnboardingContent } from "@/components/onboarding/onboarding-content";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const metadata = {
  title: "Welcome to ServStack | Get Started",
  description: "Set up your restaurant management system",
};

export default async function OnboardingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Check if organization already exists
  const org = await db.organization.findFirst();
  if (org) {
    // Organization exists, redirect to dashboard
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Suspense fallback={<OnboardingLoadingSkeleton />}>
        <OnboardingContent user={session.user} />
      </Suspense>
    </div>
  );
}

function OnboardingLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-2xl p-8 space-y-6">
        <div className="h-12 w-3/4 animate-pulse rounded-lg bg-muted" />
        <div className="h-6 w-1/2 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-4 mt-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
