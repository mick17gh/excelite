import { LoginForm } from "@/components/auth/login-form";
import { BarChart3, Monitor, Package, ShoppingCart, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { EXCELITE_BRAND } from "@/lib/excelite-config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Login",
  description: `Sign in to your ${EXCELITE_BRAND.name} account`,
};

const liteFeatures = [
  { icon: Monitor, label: "Fast POS checkout" },
  { icon: Package, label: "Inventory tracking" },
  { icon: BarChart3, label: "Daily sales view" },
  { icon: ShoppingCart, label: "Order management" },
];

export default async function LoginPage() {
  const orgBranding = await db.organization.findFirst({
    select: {
      name: true,
      storeName: true,
      storeDescription: true,
      storeLogoUrl: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const brandName =
    orgBranding?.storeName?.trim() || orgBranding?.name?.trim() || EXCELITE_BRAND.shortName;
  const brandDescription =
    orgBranding?.storeDescription?.trim() || EXCELITE_BRAND.tagline;
  const logoUrl = orgBranding?.storeLogoUrl || EXCELITE_BRAND.logo;

  return (
    <div className="relative min-h-screen excelite-login-bg overflow-hidden">
      {/* Full-page background orbs */}
      <div className="excelite-orb excelite-orb-green w-[500px] h-[500px] -top-32 -left-32 animate-excelite-pulse-ring" />
      <div className="excelite-orb excelite-orb-green w-[400px] h-[400px] bottom-0 right-1/4 animate-excelite-float-slow opacity-60" />
      <div className="excelite-orb excelite-orb-green w-[300px] h-[300px] top-1/3 right-0 animate-excelite-float opacity-50" />
      <div className="absolute inset-0 pattern-grid opacity-[0.06]" />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left — branding (over full dark bg) */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-20 py-10 lg:py-0">
          <div className="max-w-lg animate-excelite-fade-up">
            <div className="flex items-center gap-3 mb-8 lg:mb-10">
              <div className="relative h-14 w-14 rounded-2xl excelite-glass-dark p-2 animate-excelite-float shrink-0">
                <Image
                  src={logoUrl}
                  alt={EXCELITE_BRAND.name}
                  width={48}
                  height={48}
                  className="h-full w-full object-contain"
                  unoptimized={logoUrl.startsWith("http")}
                />
              </div>
              <div>
                <p className="text-2xl font-bold text-white tracking-tight">{brandName}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-[#22C55E] font-medium">
                  POS Software
                </p>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl xl:text-[2.75rem] font-bold text-white leading-tight mb-4 animate-excelite-fade-up animation-delay-100">
              Welcome back to your shop
            </h1>
            <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-8 lg:mb-10 animate-excelite-fade-up animation-delay-200">
              {brandDescription}
            </p>

            <div className="hidden sm:grid sm:grid-cols-2 gap-3 animate-excelite-fade-up animation-delay-300">
              {liteFeatures.map((feature) => (
                <div
                  key={feature.label}
                  className="excelite-glass-dark rounded-xl p-4 flex items-center gap-3 transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5"
                >
                  <div className="h-9 w-9 rounded-lg bg-[#22C55E]/20 flex items-center justify-center shrink-0">
                    <feature.icon className="h-4 w-4 text-[#4ADE80]" />
                  </div>
                  <span className="text-sm text-white/90 font-medium">{feature.label}</span>
                </div>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-2 text-white/45 text-sm mt-10 animate-excelite-fade-up animation-delay-500">
              <Sparkles className="h-4 w-4 text-[#22C55E]" />
              <span>Simple POS built for small businesses</span>
            </div>
          </div>
        </div>

        {/* Right — glass login card */}
        <div className="flex items-center justify-center px-6 sm:px-10 lg:px-12 xl:px-16 py-10 lg:py-12 lg:w-[480px] xl:w-[520px] shrink-0">
          <div className="w-full max-w-[420px] animate-excelite-scale-in animation-delay-200">
            <div className="excelite-glass-login excelite-shimmer-border rounded-2xl p-8 sm:p-10">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-white">Sign in</h2>
                <p className="text-white/50 mt-2 text-sm">
                  Enter your credentials to access your dashboard
                </p>
              </div>

              <div className="login-form-dark">
                <LoginForm variant="dark" />
              </div>

              <p className="text-center text-sm text-white/45 mt-6">
                Need an account?{" "}
                <a
                  href={EXCELITE_BRAND.supportPhoneTel}
                  className="text-[#4ADE80] hover:text-[#22C55E] font-medium transition-colors cursor-pointer"
                >
                  Call {EXCELITE_BRAND.supportPhoneDisplay} to get started
                </a>
              </p>
            </div>

            <p className="text-center mt-6">
              <Link
                href="/"
                className="text-xs text-white/35 hover:text-[#4ADE80] transition-colors cursor-pointer"
              >
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
