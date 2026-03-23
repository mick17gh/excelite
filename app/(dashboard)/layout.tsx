import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { FloatingChatWidget } from "@/components/chat";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role, SubscriptionTier } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { hasFeature } from "@/lib/tier-config";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userRole = (session?.user?.role as Role) || "STAFF";
  
  if (!session) {
    redirect("/login");
  }

  // Check if organization exists, redirect to onboarding if not
  const org = await db.organization.findFirst({ select: { tier: true } });
  if (!org) {
    redirect("/onboarding");
  }

  const orgTier: SubscriptionTier = org.tier;
  const canUseAiAssistant = hasFeature(orgTier, "aiAssistant", userRole);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar className="hidden md:flex" userRole={userRole} orgTier={orgTier} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 gradient-mesh pointer-events-none" />
        
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] gradient-orb gradient-orb-blue opacity-30 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] gradient-orb gradient-orb-purple opacity-20 pointer-events-none" />
        
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">{children}</main>
        
        {/* AI Chat Widget (tier-gated) */}
        {canUseAiAssistant && <FloatingChatWidget />}
      </div>
    </div>
  );
}
