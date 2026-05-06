import type { ElementType } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

/**
 * Use encodeURIComponent (not URLSearchParams) so spaces become %20.
 * URLSearchParams uses + for spaces, which many mobile mail apps show literally.
 */
function buildMailto(subject: string, body: string): string {
  return `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
    title: "Smarter Decision-Making with Data",
    intro:
      "Turn every transaction into a permanent, professional record—get actionable insights.",
    listLabel: "Capabilities include:",
    bullets: [
      "Custom business intelligence reports across all operations",
      "Bank ready documents to support loan applications",
      "Intelligent insights and forecasting (Pro & Premium)",
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

const faqs: Array<{ question: string; answer: string }> = [
  {
    question: "What is ServStack?",
    answer:
      "ServStack is how modern restaurants stay in control. It brings your orders, sales, kitchen, inventory, and deliveries into one system so you always know what is happening and nothing slips through the cracks.",
  },
  {
    question: "Who is ServStack built for?",
    answer:
      "It is designed for restaurant owners who want clarity and control, from single outlets that need tighter operations to growing multi-branch brands and fast-paced restaurants where speed and accuracy matter.",
  },
  {
    question: "Do I need technical skills to use it?",
    answer:
      "No. ServStack is built so your team can start using it quickly without technical training or complexity.",
  },
  {
    question: "Can ServStack help me avoid missed or confused orders?",
    answer:
      "Yes. Every order, walk-in, phone, or online, flows into one system so your team never loses track or double-processes orders.",
  },
  {
    question: "Can I accept different types of payments?",
    answer:
      "Yes. Whether it is cash, mobile money, or other payment methods, ServStack keeps everything recorded in one place.",
  },
  {
    question: "Can I track my deliveries in real time?",
    answer:
      "Yes. You always know what is being delivered, who is delivering it, and what stage each order is in.",
  },
  {
    question: "Can I see which driver handled each order?",
    answer:
      "Yes. Every delivery is assigned to a specific driver for full visibility and accountability.",
  },
  {
    question: "Why does delivery tracking matter?",
    answer:
      "Delivery is where many restaurants lose money silently. ServStack gives you control so you can stop leaks and improve reliability.",
  },
  {
    question: "Can I stop running out of stock or over-ordering?",
    answer:
      "Yes. ServStack shows what is being used in real time so you can plan better and avoid surprises.",
  },
  {
    question: "Can I reduce waste and losses?",
    answer:
      "Yes. You can clearly see usage patterns and wastage so you make smarter purchasing and production decisions.",
  },
  {
    question: "Do I know my real profit per meal?",
    answer:
      "Yes. You do not just see sales; you understand true food cost and margin per item.",
  },
  {
    question: "What changes in the kitchen with ServStack?",
    answer:
      "Orders go directly to a digital kitchen screen instead of paper slips, helping your kitchen move faster with fewer mistakes.",
  },
  {
    question: "Will this improve service speed?",
    answer:
      "Yes. Less confusion in the kitchen leads to faster output and better customer experience.",
  },
  {
    question: "Can I manage multiple branches easily?",
    answer:
      "Yes. You can see every branch in one place and understand which locations are performing best and which need more support.",
  },
  {
    question: "Does ServStack use AI?",
    answer:
      "Yes. The Pro tier includes an AI assistant built directly into your system.",
  },
  {
    question: "What does the AI assistant actually help with?",
    answer:
      "It helps you understand what is happening in your business, spot trends, highlight issues, and guide better decisions without digging through reports.",
  },
  {
    question: "What kind of insights do I get?",
    answer:
      "You get a clear picture of sales, inventory, and performance so you can see what is working and what is not.",
  },
  {
    question: "Can I see my performance in real time?",
    answer:
      "Yes. Your dashboard updates live so you operate with current information, not guesswork.",
  },
  {
    question: "Can ServStack work with delivery platforms and other tools?",
    answer:
      "Yes. It is built to integrate with external systems that allow connections so your operations stay unified, not fragmented.",
  },
  {
    question: "Is ServStack flexible as my business grows?",
    answer:
      "Yes. The system is designed to grow with you, so you can add tools and integrations as needed.",
  },
  {
    question: "How hard is it to set up?",
    answer:
      "Setup is guided and straightforward. Whether you have one branch or several, we help you get running without disruption and can recommend hardware.",
  },
  {
    question: "Will my team be trained?",
    answer:
      "Yes. We make sure your staff understands the system so you can operate confidently from day one.",
  },
  {
    question: "What if I need help later?",
    answer:
      "You are not left alone. Support is available to keep your operations running smoothly.",
  },
  {
    question: "Is there a way to try ServStack first?",
    answer:
      "Yes. You can start small and upgrade as you grow. You get a free 30-day trial and a money-back guarantee.",
  },
  {
    question: "Can I upgrade later?",
    answer:
      "Yes. Plans are flexible so you only pay for what you need at each stage.",
  },
  {
    question: "Can I move from my existing POS system?",
    answer:
      "Yes. We help you transition without disrupting your business operations.",
  },
  {
    question: "Will I lose my data when switching?",
    answer:
      "We support migration so you retain important business data where possible.",
  },
  {
    question: "Is my business data safe?",
    answer:
      "Yes. Your data is securely stored and protected so you can focus on running your business.",
  },
];

const featuredFaqs = faqs.slice(0, 6);

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
              <Link
                href="/faq"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                FAQ
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

              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-6 leading-[1.1]">
                Master Your Operations. Maximize Your Margins. Scale with
                Confidence.
              </h1>

              <div className="space-y-4 text-lg md:text-xl text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                <p>
                  Fragmented systems lead to missed orders, lost inventory, and
                  hidden revenue leaks.
                </p>
                <p className="text-foreground font-medium">
                  ServStack brings everything together—from order capture to
                  inventory control—into one seamless command center.
                </p>
              </div>

              <p className="text-base md:text-lg text-foreground/90 font-medium mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed border-l-4 border-emerald-500 pl-4">
                With built-in digital records, you&apos;re not just staying
                organized—you&apos;re building a business banks can trust. Every
                transaction, every report, every insight creates the financial
                history lenders require, putting you in a stronger position to
                access funding and grow.
              </p>
              <p className="text-base md:text-lg text-foreground font-semibold mb-8 max-w-xl mx-auto lg:mx-0">
                See the gaps. Fix the leaks. Build a business banks are ready to
                back.
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
      <section className="hidden py-12 border-y bg-muted/30">
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
              <ProfitabilityPillar key={pillar.title} {...pillar} />
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
      <section className="hidden py-20 bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white relative overflow-hidden">
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
                  "I usually spend weeks chasing restaurant owners for clear financial statements, and even then, the numbers rarely add up. Recently, a client brought in a full performance report generated directly from ServStack. The transparency was impressive, actual margins, inventory value, and verified sales. It turned a difficult loan conversation into a very quick 'yes.' It's the kind of data evidence we actually look for.",
                author: "Kwesi Mensah",
                role: "Senior Credit Officer, GCB",
                avatar: "KM",
                color: "bg-emerald-500",
              },
              {
                quote:
                  "A reputable client wanted to expand, but they weren't sure where. We looked at their ServStack delivery data and realized 40% of their orders were actually being shipped to the Haatso area, despite the long wait times. We opened a 'satellite' branch there last month, and it was profitable by week 3. Using actual delivery intelligence took the guesswork out of the expansion.",
                author: "Georgina Acquaye",
                role: "Growth Strategist",
                avatar: "GA",
                color: "bg-blue-500",
              },
              {
                quote:
                  "Before ServStack, I was tired of hearing 'Boss, the charcoal is finished' or 'the chicken is short' without any warning. And my customers were complaining about wrong orders every Friday night. Now, I see my real costs daily. I know exactly where my money is going, and the kitchen staff have no excuses anymore. Order mistakes have dropped significantly, and I finally feel like I'm in control of my profit, not just my staff.",
                author: 'Evans "Bones" Turkson',
                role: "CEO, Chancellor Grill, Accra",
                avatar: "ET",
                color: "bg-purple-500",
              },
              {
                quote:
                  "I was worried about the 'AI' and the technical side of things because I am not a computer person. But the ServStack team stayed with us for two days straight to train my servers and the kitchen team. Even when I had a small issue with the receipt printer on a busy Saturday, their support team was on WhatsApp immediately to fix it. They don't just sell you a system and run away; they actually help you use it.",
                author: "Tracy",
                role: "Milky Moments, Kwabenya",
                avatar: "TR",
                color: "bg-rose-500",
              },
              {
                quote:
                  "Moving four branches away from our old POS was a headache I was avoiding for a long time. I thought the transition would be a mess, but the migration to ServStack was surprisingly smooth. Being able to see all my locations from my phone while I'm at home, comparing which branch is wasting more and which is selling more—has been a game changer. Yes, it's an investment, but the money we've saved on inventory leaks alone paid for the system in the first three months.",
                author: "Alisha T",
                role: "Managing Director, 2 Cousinns Pizza, Lancaster PA, USA (4 Locations)",
                avatar: "AT",
                color: "bg-cyan-500",
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

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-24 border-y bg-muted/20">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-4">
              FAQ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              ServStack FAQ
            </h2>
            <p className="text-muted-foreground">
              Top questions from restaurant operators.
            </p>
          </div>

          <Card>
            <CardContent className="p-4 md:p-6">
              <Accordion type="single" collapsible className="w-full">
                {featuredFaqs.map((item, index) => (
                  <AccordionItem key={item.question} value={`faq-${index}`}>
                    <AccordionTrigger className="text-base font-medium">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <div className="mt-6 text-center">
                <Button asChild variant="outline">
                  <Link href="/faq">View all FAQs</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
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
                  { label: "FAQ", href: "/faq" },
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
  title,
  intro,
  listLabel,
  bullets,
  icon: Icon,
  gradient,
}: {
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
        </div>
        <div className="min-w-0">
          <div className="mb-2">
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
