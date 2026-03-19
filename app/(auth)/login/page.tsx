import { LoginForm } from "@/components/auth/login-form";
import { TrendingUp, BarChart3, Package, Users, Bell } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Login | ServStack",
  description: "Sign in to your ServStack account",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Gradient Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 gradient-animated" />
        
        {/* Decorative orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 gradient-orb gradient-orb-purple" />
        <div className="absolute bottom-20 right-20 w-96 h-96 gradient-orb gradient-orb-blue" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 gradient-orb gradient-orb-indigo" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 pattern-grid opacity-30" />
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center p-12 w-full">
          <div className="max-w-md text-center text-white">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                <TrendingUp className="h-8 w-8" />
              </div>
              <span className="text-3xl font-bold">ServStack</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              The Command Center for Restaurant Growth
            </h1>
            <p className="text-lg text-white/80 mb-12">
              Run all your branches from one platform. Track sales, manage inventory,
              optimize operations, and boost profitability.
            </p>
            
            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: BarChart3, label: "Real-time Analytics" },
                { icon: Package, label: "Inventory Control" },
                { icon: Users, label: "Staff Management" },
                { icon: Bell, label: "Smart Alerts" },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
                >
                  <feature.icon className="h-5 w-5 text-white/80" />
                  <span className="text-sm text-white/90">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form with subtle gradient */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 gradient-mesh" />
        
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">ServStack</span>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2">
              Sign in to your account to continue
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card/80 backdrop-blur-sm border shadow-xl gradient-glow">
            <LoginForm />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Contact your administrator
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
