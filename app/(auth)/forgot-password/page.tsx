import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { TrendingUp } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Forgot Password | Dinelytix",
  description: "Reset your Dinelytix password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 gradient-mesh" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold gradient-text">Dinelytix</span>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Forgot your password?</h2>
          <p className="text-muted-foreground mt-2">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-card/80 backdrop-blur-sm border shadow-xl gradient-glow">
          <ForgotPasswordForm />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
