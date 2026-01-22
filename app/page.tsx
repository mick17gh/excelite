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
  Globe,
  Activity,
  Star,
  ChevronRight,
  Sparkles,
  Target,
  Clock,
  TrendingDown,
  Utensils,
  ChefHat,
  Receipt,
  Wallet,
  CircleDollarSign,
  LayoutDashboard,
  Smartphone,
  Lock,
  HeadphonesIcon,
} from "lucide-react";

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
              <span className="text-xl font-bold tracking-tight">Dinelytix</span>
            </div>
            
            <div className="hidden lg:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</Link>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="font-medium">Sign In</Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 font-medium">
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
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-6 border border-emerald-200/50 dark:border-emerald-800/50">
                <Sparkles className="h-4 w-4" />
                <span>Built for Restaurant Chains in Ghana & Africa</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                Turn Your Restaurant Data Into{" "}
                <span className="text-transparent bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text">
                  Revenue Growth
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                The all-in-one analytics platform for multi-branch restaurants. Track sales, manage inventory, 
                optimize operations, and boost profitability — all from one dashboard.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link href="/login">
                  <Button size="lg" className="h-14 px-8 text-base bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xl shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] w-full sm:w-auto">
                    Start Free 14-Day Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                {/* <Button size="lg" variant="outline" className="h-14 px-8 text-base group w-full sm:w-auto border-2">
                  <Play className="mr-2 h-5 w-5 group-hover:text-emerald-600 transition-colors" />
                  Watch 2-Min Demo
                </Button> */}
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>Setup in 5 minutes</span>
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
                    <span className="text-xs text-muted-foreground font-medium">app.dinelytix.com</span>
                  </div>
                </div>
                <div className="p-4 md:p-6 bg-linear-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Today's Revenue", value: "GH₵ 12,450", change: "+18.5%", icon: CircleDollarSign, color: "text-emerald-600" },
                      { label: "Orders", value: "156", change: "+12.3%", icon: Receipt, color: "text-blue-600" },
                      { label: "Avg. Order", value: "GH₵ 79.80", change: "+5.2%", icon: Wallet, color: "text-purple-600" },
                      { label: "Branches", value: "8", change: "Online", icon: Building2, color: "text-teal-600" },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border">
                        <div className="flex items-center gap-2 mb-1">
                          <stat.icon className={`h-4 w-4 ${stat.color}`} />
                          <p className="text-[10px] md:text-xs text-muted-foreground truncate">{stat.label}</p>
                        </div>
                        <p className="text-lg md:text-xl font-bold">{stat.value}</p>
                        <span className="text-[10px] md:text-xs text-emerald-600 font-medium">{stat.change}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-3 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">Revenue Trend</span>
                        <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">+23%</Badge>
                      </div>
                      <div className="h-20 flex items-end gap-1">
                        {[40, 65, 45, 80, 55, 95, 70, 88, 60, 100, 85, 92].map((h, i) => (
                          <div key={i} className="flex-1 bg-linear-to-t from-emerald-500 to-teal-400 rounded-t" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border">
                      <span className="text-xs font-medium text-muted-foreground">Top Branches</span>
                      <div className="mt-3 space-y-2">
                        {["Accra Mall", "Osu Oxford", "East Legon"].map((branch, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-500' : 'bg-purple-500'}`} />
                            <span className="text-xs truncate">{branch}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-white dark:bg-slate-800 rounded-xl p-3 shadow-xl border hidden md:block">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Sales Up</p>
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
                    <p className="text-[10px] text-muted-foreground">Low Stock Alert</p>
                    <p className="text-xs font-medium">3 items need reorder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              Trusted by <span className="font-semibold text-foreground">100+</span> restaurants across Ghana
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              {[
                { name: "Papaye", icon: Utensils },
                { name: "Chicken Inn", icon: ChefHat },
                { name: "KFC Ghana", icon: Utensils },
                { name: "Burger King", icon: ChefHat },
              ].map((brand, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                  <brand.icon className="h-5 w-5" />
                  <span className="text-lg font-semibold">{brand.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">The Problem</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Running Multiple Branches Is Hard</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Without the right tools, you&apos;re flying blind. Sound familiar?
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              { icon: TrendingDown, title: "Revenue Leakage", description: "Sales discrepancies go unnoticed for weeks", color: "text-red-500" },
              { icon: Package, title: "Inventory Chaos", description: "Stock-outs and waste eating into profits", color: "text-amber-500" },
              { icon: Clock, title: "Manual Reporting", description: "Hours wasted compiling data from each branch", color: "text-orange-500" },
              { icon: Target, title: "Missed Targets", description: "No visibility into what's working and what isn't", color: "text-red-500" },
            ].map((problem, i) => (
              <div key={i} className="relative group">
                <div className="absolute inset-0 bg-linear-to-br from-red-500/5 to-transparent rounded-2xl" />
                <div className="relative p-6 rounded-2xl border border-red-200/50 dark:border-red-800/30 bg-card">
                  <problem.icon className={`h-10 w-10 ${problem.color} mb-4`} />
                  <h3 className="font-semibold mb-2">{problem.title}</h3>
                  <p className="text-sm text-muted-foreground">{problem.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <span>The Solution</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Dinelytix Gives You Complete Visibility</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              One platform to monitor, analyze, and optimize every aspect of your restaurant operations.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 bg-linear-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Scale</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed specifically for multi-branch restaurant operations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <FeatureCard
              icon={LayoutDashboard}
              title="Executive Dashboard"
              description="Real-time overview of all branches with KPIs, trends, and alerts. See everything at a glance."
              gradient="from-emerald-500 to-teal-500"
            />
            <FeatureCard
              icon={Building2}
              title="Multi-Branch Analytics"
              description="Compare performance across locations. Identify top performers and branches that need attention."
              gradient="from-blue-500 to-indigo-500"
            />
            <FeatureCard
              icon={Package}
              title="Smart Inventory"
              description="Track stock levels, get low-stock alerts, manage transfers between branches, and reduce waste."
              gradient="from-purple-500 to-pink-500"
            />
            <FeatureCard
              icon={Activity}
              title="Sales Intelligence"
              description="Analyze sales by channel, time of day, and menu item. Identify your best sellers."
              gradient="from-orange-500 to-red-500"
            />
            <FeatureCard
              icon={Users}
              title="Staff Management"
              description="Track attendance, manage schedules, and optimize labor costs across all locations."
              gradient="from-cyan-500 to-blue-500"
            />
            <FeatureCard
              icon={Bell}
              title="Smart Alerts"
              description="Get notified instantly about sales drops, inventory issues, and operational anomalies."
              gradient="from-amber-500 to-orange-500"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Get Started in 3 Simple Steps</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No complex integrations needed. Start getting insights in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "01",
                title: "Connect Your POS",
                description: "We integrate with all major POS systems. Or use our built-in POS for a complete solution.",
                icon: Globe,
                color: "from-emerald-500 to-teal-500",
              },
              {
                step: "02",
                title: "Add Your Branches",
                description: "Set up each branch in minutes. Configure targets and assign managers for each location.",
                icon: Building2,
                color: "from-blue-500 to-indigo-500",
              },
              {
                step: "03",
                title: "Start Growing",
                description: "Access real-time insights immediately. Make data-driven decisions that boost revenue.",
                icon: Zap,
                color: "from-purple-500 to-pink-500",
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="text-7xl font-bold text-muted/10 mb-4">{item.step}</div>
                <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${item.color} p-3 mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <item.icon className="h-full w-full text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-6 h-8 w-8 text-muted-foreground/20" />
                )}
              </div>
            ))}
          </div>
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
              { value: "GH₵ 50M+", label: "Revenue Tracked", icon: CircleDollarSign },
              { value: "99.9%", label: "Uptime", icon: Zap },
            ].map((stat, i) => (
              <div key={i} className="group">
                <stat.icon className="h-8 w-8 mx-auto mb-3 opacity-80 group-hover:scale-110 transition-transform" />
                <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
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
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Restaurant Owners</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what our customers have to say about Dinelytix.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Dinelytix helped us reduce food waste by 32% in just 3 months. The inventory alerts are a game-changer for our 8 branches.",
                author: "Kwame Asante",
                role: "CEO, Golden Grills Ghana",
                avatar: "KA",
                color: "bg-emerald-500",
              },
              {
                quote: "Before Dinelytix, I spent hours every week compiling reports from each branch. Now I have real-time visibility on my phone.",
                author: "Ama Mensah",
                role: "Operations Director, Tasty Bites",
                avatar: "AM",
                color: "bg-blue-500",
              },
              {
                quote: "The multi-branch comparison feature helped us identify which branches were underperforming. We improved revenue by 25% in Q1.",
                author: "Yaw Boateng",
                role: "Managing Partner, Local Delights",
                avatar: "YB",
                color: "bg-purple-500",
              },
            ].map((testimonial, i) => (
              <Card key={i} className="bg-card hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${testimonial.color} flex items-center justify-center text-white font-semibold text-sm`}>
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
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
              { icon: Shield, title: "Bank-Level Security", description: "256-bit SSL encryption" },
              { icon: Lock, title: "Data Privacy", description: "Your data stays yours" },
              { icon: Smartphone, title: "Mobile Ready", description: "Access anywhere, anytime" },
              { icon: HeadphonesIcon, title: "24/7 Support", description: "Always here to help" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                  <item.icon className="h-6 w-6 text-emerald-600" />
                </div>
                <h4 className="font-semibold mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="relative rounded-3xl bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 p-10 md:p-16 text-center text-white overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff1_1px,transparent_1px),linear-gradient(to_bottom,#fff1_1px,transparent_1px)] bg-size[24px_24px]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Ready to Grow Your Restaurant Business?
              </h2>
              <p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
                Join 100+ restaurant owners who are already using Dinelytix to make smarter decisions and boost profitability.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-medium">
                    Start Free 14-Day Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base border-white/30 text-white hover:bg-white/10 font-medium">
                  Schedule a Demo
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
                <span className="text-xl font-bold">Dinelytix</span>
              </div>
              <p className="text-muted-foreground mb-4 max-w-xs">
                Smart analytics for modern restaurants. Real-time insights for data-driven decisions.
              </p>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-muted-foreground">Enterprise-grade security</span>
              </div>
            </div>
            
            {[
              { title: "Product", links: ["Features", "Pricing", "Integrations", "API Docs"] },
              { title: "Company", links: ["About Us", "Blog", "Careers", "Contact"] },
              { title: "Support", links: ["Help Center", "Documentation", "Status", "Security"] },
            ].map((section, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              © 2026 Dinelytix. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="group relative rounded-2xl border bg-card p-6 transition-all hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 dark:hover:border-blue-800">
      <div className={`rounded-xl bg-linear-to-br ${gradient} p-3 w-fit mb-4 shadow-lg`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
