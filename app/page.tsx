import type { ElementType } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Package,
  Users,
  Bell,
  Building2,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Activity,
  Star,
  Sparkles,
  Utensils,
  ChefHat,
  Receipt,
  Wallet,
  CircleDollarSign,
  Smartphone,
  Lock,
  HeadphonesIcon,
  Eye,
  Percent,
  Brain,
  Store,
} from "lucide-react";

const SALES_EMAIL =
  process.env.NEXT_PUBLIC_SALES_EMAIL ?? "miteexpressgh@gmail.com";

function buildMailto(subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${SALES_EMAIL}?${params.toString()}`;
}

const DEMO_MAILTO = buildMailto(
  "Book a demo – ServStack",
  "Hi,\n\nI'd like to schedule a demo of ServStack.\n\n",
);

const PRICING_MAILTO = buildMailto(
  "ServStack pricing inquiry",
  "Hi,\n\nI'd like to learn about ServStack pricing.\n\n",
);

const profitabilityPillars: Array<{
  title: string;
  intro: string;
  listLabel: string;
  bullets: string[];
  icon: ElementType;
  gradient: string;
}> = [
  {
    title: "Total Operational Visibility",
    intro:
      "See everything happening across your business in real time—from sales and inventory to branch performance.",
    listLabel: "What this means for you:",
    bullets: [
      "No more waiting for end-of-day or weekly reports",
      "Identify issues instantly (low stock, high waste, underperforming branches)",
      "Make faster, data-driven decisions",
    ],
    icon: Eye,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    title: "Increased Revenue Across All Channels",
    intro:
      "Capture more orders and ensure every transaction is processed accurately.",
    listLabel: "How ServStack helps:",
    bullets: [
      "Unified POS, online, and call center ordering",
      "Faster service = higher throughput",
      "Better customer experience = more repeat business",
    ],
    icon: Store,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    title: "Stronger Margin Control",
    intro:
      "Understand exactly how much every item costs—and protect your profitability.",
    listLabel: "With ServStack:",
    bullets: [
      "Real-time recipe-based costing",
      "Instant visibility into food cost percentages",
      "Ability to adjust pricing immediately",
    ],
    icon: Percent,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    title: "Reduced Waste & Inventory Loss",
    intro: "Stop profit leaks caused by poor inventory tracking and spoilage.",
    listLabel: "You gain:",
    bullets: [
      "Real-time inventory tracking tied to every sale",
      "Waste logging and usage insights",
      "Smarter purchasing and stock planning",
    ],
    icon: Package,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    title: "Faster, More Efficient Operations",
    intro: "Streamline workflows across front-of-house and back-of-house.",
    listLabel: "Operational improvements:",
    bullets: [
      "High-speed POS reduces queues",
      "ChefView KDS keeps kitchen organized and efficient",
      "Automated processes reduce manual work",
    ],
    icon: Zap,
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    title: "Seamless Multi-Branch Management",
    intro: "Expand your business without losing control.",
    listLabel: "Built for growth:",
    bullets: [
      "Add and manage multiple locations",
      "Track performance per branch in real time",
      "Set and monitor KPIs across all locations",
    ],
    icon: Building2,
    gradient: "from-teal-500 to-emerald-600",
  },
  {
    title: "Smarter Decision-Making with Data & AI",
    intro:
      "Turn your data into actionable insights—without needing a data analyst.",
    listLabel: "Capabilities include:",
    bullets: [
      "Custom BI reporting across all operations",
      "Real-time alerts for critical issues",
      "AI-powered insights and forecasting (Pro & Premium)",
    ],
    icon: Brain,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    title: "Better Customer Retention & Engagement",
    intro: "Turn first-time customers into loyal, repeat buyers.",
    listLabel: "With built-in CRM:",
    bullets: [
      "Track customer behavior and order history",
      "Launch targeted promotions and loyalty campaigns",
      "Deliver personalized experiences at scale",
    ],
    icon: Users,
    gradient: "from-rose-500 to-red-500",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 lg:px-8">
          <nav className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/30">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                ServStack
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-8">
              <Link
                href="#about"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </Link>
              <Link
                href="#features"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Profitability
              </Link>
              <Link
                href="#pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="#testimonials"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Testimonials
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="sm"
                  className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 font-medium"
                >
                  Get Started Free
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-20 md:pt-16 md:pb-32">
        <div className="absolute inset-0 bg-linear-to-br from-emerald-50/50 via-background to-cyan-50/30 dark:from-emerald-950/20 dark:via-background dark:to-cyan-950/10" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl" />

        <div className="container relative mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-6 border border-emerald-200/50 dark:border-emerald-800/50">
                <Sparkles className="h-4 w-4" />
                <span>Built for QSR operators &amp; multi-branch brands</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                You&apos;re Losing Revenue in{" "}
                <span className="text-transparent bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text">
                  Places You Can&apos;t See
                </span>
              </h1>

              <div className="space-y-4 text-lg md:text-xl text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                <p>
                  Long wait times. Missed orders. Inventory shrinkage.
                  Inefficient kitchens.
                </p>
                <p>
                  These hidden problems quietly drain your profits every single
                  day—without showing up clearly in your reports.
                </p>
                <p className="text-foreground font-medium">
                  ServStack exposes these gaps, fixes them in real time, and
                  gives you complete control over your operations.
                </p>
              </div>

              <p className="text-base md:text-lg text-foreground/90 font-medium mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed border-l-4 border-emerald-500 pl-4">
                From order capture to inventory to multi-branch
                performance—everything connected, optimized, and working for
                your profitability.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="h-14 px-8 text-base bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xl shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] w-full sm:w-auto"
                  >
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-base w-full sm:w-auto border-2"
                  asChild
                >
                  <a href={DEMO_MAILTO}>Book a Demo</a>
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>Setup in minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>Free onboarding</span>
                </div>
              </div>
            </div>

            {/* Right Content - Dashboard Preview */}
            <div className="relative lg:pl-8">
              <div className="absolute -inset-4 bg-linear-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-3xl" />
              <div className="relative rounded-2xl border-2 bg-card/80 backdrop-blur-sm shadow-2xl overflow-hidden">
                <div className="bg-muted/80 px-4 py-3 border-b flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-muted-foreground font-medium">
                      app.servstack.com
                    </span>
                  </div>
                </div>
                <div className="p-4 md:p-6 bg-linear-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      {
                        label: "Today's Revenue",
                        value: "GH₵ 12,450",
                        change: "+18.5%",
                        icon: CircleDollarSign,
                        color: "text-emerald-600",
                      },
                      {
                        label: "Orders",
                        value: "156",
                        change: "+12.3%",
                        icon: Receipt,
                        color: "text-blue-600",
                      },
                      {
                        label: "Avg. Order",
                        value: "GH₵ 79.80",
                        change: "+5.2%",
                        icon: Wallet,
                        color: "text-purple-600",
                      },
                      {
                        label: "Branches",
                        value: "8",
                        change: "Online",
                        icon: Building2,
                        color: "text-teal-600",
                      },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <stat.icon className={`h-4 w-4 ${stat.color}`} />
                          <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                            {stat.label}
                          </p>
                        </div>
                        <p className="text-lg md:text-xl font-bold">
                          {stat.value}
                        </p>
                        <span className="text-[10px] md:text-xs text-emerald-600 font-medium">
                          {stat.change}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-3 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">
                          Revenue Trend
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-emerald-100 text-emerald-700"
                        >
                          +23%
                        </Badge>
                      </div>
                      <div className="h-20 flex items-end gap-1">
                        {[40, 65, 45, 80, 55, 95, 70, 88, 60, 100, 85, 92].map(
                          (h, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-linear-to-t from-emerald-500 to-teal-400 rounded-t"
                              style={{ height: `${h}%` }}
                            />
                          ),
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border">
                      <span className="text-xs font-medium text-muted-foreground">
                        Top Branches
                      </span>
                      <div className="mt-3 space-y-2">
                        {["Accra Mall", "Osu Oxford", "East Legon"].map(
                          (branch, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  i === 0
                                    ? "bg-emerald-500"
                                    : i === 1
                                      ? "bg-blue-500"
                                      : "bg-purple-500"
                                }`}
                              />
                              <span className="text-xs truncate">{branch}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-xl border hidden md:block">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Sales Up
                    </p>
                    <p className="text-sm font-bold text-emerald-600">+23.5%</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-xl border hidden md:block">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Low Stock Alert
                    </p>
                    <p className="text-xs font-medium">3 items need reorder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About ServStack */}
      <section id="about" className="py-16 md:py-20 border-b bg-muted/20">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <Badge
            variant="secondary"
            className="mb-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            About ServStack
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for Restaurants Ready to Operate Smarter, Grow Faster and
            Increase Profits
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
            <p>
              ServStack is a fully integrated operating system designed to help
              Quick Service Restaurant (QSR) businesses run smarter, faster, and
              more profitably.
            </p>
            <p>
              Modern restaurant operations are complex—orders come from multiple
              channels, kitchens must move at speed, inventory needs tight
              control, and leadership demands real-time visibility. Most
              businesses manage this with disconnected tools, spreadsheets, and
              manual processes.
            </p>
            <p className="text-foreground font-medium">
              ServStack replaces that complexity with a single, unified
              platform.
            </p>
            <p>
              From order capture to kitchen execution, inventory management to
              executive insights, ServStack connects every part of your
              operation into one seamless system—giving you full control in real
              time.
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              Trusted by{" "}
              <span className="font-semibold text-foreground">100+</span>{" "}
              restaurants across Ghana
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              {[
                { name: "Papaye", icon: Utensils },
                { name: "Chicken Inn", icon: ChefHat },
                { name: "KFC Ghana", icon: Utensils },
                { name: "Burger King", icon: ChefHat },
              ].map((brand, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <brand.icon className="h-5 w-5" />
                  <span className="text-lg font-semibold">{brand.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How ServStack Drives Profitability */}
      <section
        id="features"
        className="py-20 md:py-28 bg-linear-to-b from-muted/30 to-background"
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <Badge
              variant="secondary"
              className="mb-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            >
              Profitability
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How ServStack Drives Profitability
            </h2>
            <p className="text-lg text-muted-foreground">
              Eight ways the platform turns operational clarity into stronger
              margins and growth.
            </p>
          </div>

          <div className="space-y-8 max-w-5xl mx-auto">
            {profitabilityPillars.map((pillar, index) => (
              <ProfitabilityPillar
                key={pillar.title}
                index={index + 1}
                {...pillar}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Who ServStack Is For */}
      <section className="py-16 md:py-20 border-y bg-background">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
            Who ServStack Is For
          </h2>
          <p className="text-muted-foreground mb-6 text-center">
            ServStack is built for:
          </p>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Single-location QSR owners looking to streamline operations
              </span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Multi-branch operators seeking visibility and control</span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Growing restaurant brands preparing to scale</span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Enterprise QSR groups needing centralized management</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Closing positioning */}
      <section className="py-16 md:py-20 bg-muted/40">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            ServStack is more than a POS or inventory tool—it is the central
            nervous system of your food business.
          </h2>
          <p className="text-muted-foreground mb-8">It gives you:</p>
          <ul className="text-left space-y-4 max-w-md mx-auto">
            <li className="flex gap-3 items-start">
              <Activity className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">Control over your operations</span>
            </li>
            <li className="flex gap-3 items-start">
              <Eye className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">Clarity in your decisions</span>
            </li>
            <li className="flex gap-3 items-start">
              <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">Confidence in your growth</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Pricing / Contact Sales */}
      <section id="pricing" className="py-12 border-b bg-card">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-2xl">
          <h2 className="text-xl font-semibold mb-2">Pricing</h2>
          <p className="text-muted-foreground mb-6">
            Plans are tailored to your footprint and modules. Contact our team
            for a quote that fits your business.
          </p>
          <Button asChild variant="outline" className="font-medium">
            <a href={PRICING_MAILTO}>Contact Sales</a>
          </Button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff1_1px,transparent_1px),linear-gradient(to_bottom,#fff1_1px,transparent_1px)] bg-size[24px_24px]" />
        <div className="container relative mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "100+", label: "Restaurants", icon: Utensils },
              { value: "500+", label: "Branches Connected", icon: Building2 },
              {
                value: "GH₵ 50M+",
                label: "Revenue Tracked",
                icon: CircleDollarSign,
              },
              { value: "99.9%", label: "Uptime", icon: Zap },
            ].map((stat, i) => (
              <div key={i} className="group">
                <stat.icon className="h-8 w-8 mx-auto mb-3 opacity-80 group-hover:scale-110 transition-transform" />
                <div className="text-4xl md:text-5xl font-bold mb-2">
                  {stat.value}
                </div>
                <div className="text-emerald-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Testimonials
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by Restaurant Owners
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what our customers have to say about ServStack.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote:
                  "ServStack helped us reduce food waste by 32% in just 3 months. The inventory alerts are a game-changer for our 8 branches.",
                author: "Kwame Asante",
                role: "CEO, Golden Grills Ghana",
                avatar: "KA",
                color: "bg-emerald-500",
              },
              {
                quote:
                  "Before ServStack, I spent hours every week compiling reports from each branch. Now I have real-time visibility on my phone.",
                author: "Ama Mensah",
                role: "Operations Director, Tasty Bites",
                avatar: "AM",
                color: "bg-blue-500",
              },
              {
                quote:
                  "The multi-branch comparison feature helped us identify which branches were underperforming. We improved revenue by 25% in Q1.",
                author: "Yaw Boateng",
                role: "Managing Partner, Local Delights",
                avatar: "YB",
                color: "bg-purple-500",
              },
            ].map((testimonial, i) => (
              <Card
                key={i}
                className="bg-card hover:shadow-xl transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star
                        key={j}
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${testimonial.color} flex items-center justify-center text-white font-semibold text-sm`}
                    >
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="py-16 border-y bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              {
                icon: Shield,
                title: "Bank-Level Security",
                description: "256-bit SSL encryption",
              },
              {
                icon: Lock,
                title: "Data Privacy",
                description: "Your data stays yours",
              },
              {
                icon: Smartphone,
                title: "Mobile Ready",
                description: "Access anywhere, anytime",
              },
              {
                icon: HeadphonesIcon,
                title: "24/7 Support",
                description: "Always here to help",
              },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                  <item.icon className="h-6 w-6 text-emerald-600" />
                </div>
                <h4 className="font-semibold mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="relative rounded-3xl bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 p-10 md:p-16 text-center text-white overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff1_1px,transparent_1px),linear-gradient(to_bottom,#fff1_1px,transparent_1px)] bg-size[24px_24px]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Ready to run your QSR with total control?
              </h2>
              <p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
                Start your trial or speak with our team about a demo tailored to
                your operations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-14 px-8 text-base font-medium"
                  >
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-base border-white/30 text-white hover:bg-white/10 font-medium"
                  asChild
                >
                  <a href={DEMO_MAILTO}>Book a Demo</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">ServStack</span>
              </div>
              <p className="text-muted-foreground mb-4 max-w-xs">
                The unified operating system for QSR: orders, kitchen,
                inventory, and insights in one place.
              </p>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-muted-foreground">
                  Enterprise-grade security
                </span>
              </div>
            </div>

            {[
              {
                title: "Product",
                links: [
                  { label: "Profitability", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "Testimonials", href: "#testimonials" },
                ],
              },
              { title: "Company", links: [{ label: "About", href: "#about" }] },
              {
                title: "Support",
                links: [
                  { label: "Help Center", href: "#" },
                  { label: "Documentation", href: "#" },
                ],
              },
            ].map((section, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              © 2026 ServStack. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProfitabilityPillar({
  index,
  title,
  intro,
  listLabel,
  bullets,
  icon: Icon,
  gradient,
}: {
  index: number;
  title: string;
  intro: string;
  listLabel: string;
  bullets: string[];
  icon: ElementType;
  gradient: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="grid md:grid-cols-[auto_1fr] gap-6 md:gap-10">
        <div className="flex md:flex-col items-start gap-4">
          <div
            className={`rounded-xl bg-linear-to-br ${gradient} p-3 shadow-lg shrink-0`}
            aria-hidden
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <span className="text-sm font-semibold text-muted-foreground tabular-nums md:hidden">
            {index}.
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2 mb-2">
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums hidden md:inline">
              {index}.
            </span>
            <h3 className="text-xl md:text-2xl font-semibold">{title}</h3>
          </div>
          <p className="text-muted-foreground mb-4 leading-relaxed">{intro}</p>
          <p className="text-sm font-medium text-foreground mb-2">
            {listLabel}
          </p>
          <ul className="space-y-2 text-muted-foreground list-disc pl-5 marker:text-emerald-600">
            {bullets.map((b, i) => (
              <li key={i} className="leading-relaxed">
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
