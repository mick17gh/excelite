import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import Link from "next/link";
import Image from "next/image";
import { EXCELITE_BRAND } from "@/lib/excelite-config";

export const metadata = {
  title: "Reset Password",
  description: `Create a new password for your ${EXCELITE_BRAND.name} account`,
};

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 md:p-8 overflow-hidden excelite-hero-bg">
      <div className="excelite-orb excelite-orb-green w-[320px] h-[320px] -top-20 -right-20 animate-excelite-pulse-ring opacity-60" />
      <div className="excelite-orb excelite-orb-green w-[200px] h-[200px] bottom-12 left-[-40px] animate-excelite-float-slow opacity-40" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex items-center justify-center gap-2">
          <Image
            src={EXCELITE_BRAND.logo}
            alt={`${EXCELITE_BRAND.name} logo`}
            width={40}
            height={40}
            className="rounded-lg shadow-md"
          />
          <span className="text-2xl font-bold text-[#222831]">{EXCELITE_BRAND.shortName}</span>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[#222831]">
            Reset your password
          </h2>
          <p className="text-[#222831]/60 mt-2">Enter your new password below</p>
        </div>

        <div className="p-6 md:p-8 rounded-2xl excelite-glass border border-white/60 shadow-lg">
          <Suspense
            fallback={<div className="h-32 flex items-center justify-center">Loading...</div>}
          >
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="text-center text-sm text-[#222831]/60">
          Remember your password?{" "}
          <Link href="/login" className="text-[#16A34A] hover:underline font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
