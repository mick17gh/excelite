import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  BarChart3,
  Package,
  Users,
  Bell,
  Building2,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Globe,
  LineChart,
  PieChart,
  Activity,
  Star,
  Quote,
  Play,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <nav className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Dinelytix</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              <Link href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</Link>
              <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-background to-purple-50/30 dark:from-blue-950/20 dark:via-background dark:to-purple-950/10" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
              <Sparkles className="mr-2 h-4 w-4" />
              Trusted by 500+ Restaurant Chains
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text">
              Command Your Restaurant Empire with{" "}
              <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                AI-Powered Insights
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The executive analytics platform that gives you real-time visibility across all branches. 
              Make data-driven decisions, reduce waste, and maximize profitability.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-xl shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-105">
                  Start Free 14-Day Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base group">
                <Play className="mr-2 h-5 w-5 group-hover:text-blue-600 transition-colors" />
                Watch Demo
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Setup in 5 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-3xl opacity-10" />
            <div className="relative rounded-2xl border bg-card shadow-2xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-muted-foreground">dashboard.dinelytix.com</span>
                </div>
              </div>
              <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Total Revenue", value: "$528,450", change: "+8.5%" },
                    { label: "Transactions", value: "7,630", change: "+12.3%" },
                    { label: "Avg Ticket", value: "$69.20", change: "+3.2%" },
                    { label: "Active Branches", value: "12", change: "100%" },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border">
                      <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-xl font-bold">{stat.value}</p>
                      <span className="text-xs text-green-600">{stat.change}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border h-48 flex items-center justify-center">
                    <LineChart className="h-24 w-24 text-blue-200 dark:text-blue-900" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border h-48 flex items-center justify-center">
                    <PieChart className="h-20 w-20 text-purple-200 dark:text-purple-900" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-16 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-8">Trusted by leading restaurant brands worldwide</p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50">
            {["Brand 1", "Brand 2", "Brand 3", "Brand 4", "Brand 5"].map((brand, i) => (
              <div key={i} className="text-2xl font-bold text-muted-foreground/50">{brand}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to run smarter restaurants</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From real-time analytics to automated alerts, Dinelytix gives you complete visibility and control.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={BarChart3}
              title="Executive Dashboard"
              description="Bird's-eye view of all operations with real-time KPIs, revenue trends, and actionable insights."
              gradient="from-blue-500 to-cyan-500"
            />
            <FeatureCard
              icon={Building2}
              title="Multi-Branch Analytics"
              description="Compare performance across locations, identify top performers and branches needing attention."
              gradient="from-purple-500 to-pink-500"
            />
            <FeatureCard
              icon={Package}
              title="Inventory Intelligence"
              description="Track stock in real-time, get low-stock alerts, manage transfers, and reduce waste by up to 30%."
              gradient="from-orange-500 to-red-500"
            />
            <FeatureCard
              icon={Activity}
              title="Sales Performance"
              description="Analyze sales by channel, daypart, and menu item. Identify peak hours and optimize staffing."
              gradient="from-green-500 to-emerald-500"
            />
            <FeatureCard
              icon={Users}
              title="Staff Management"
              description="Track scheduling, attendance, and labor costs. Ensure optimal coverage during peak hours."
              gradient="from-blue-500 to-indigo-500"
            />
            <FeatureCard
              icon={Bell}
              title="Smart Alerts"
              description="Automated notifications for sales drops, inventory issues, and operational anomalies."
              gradient="from-amber-500 to-orange-500"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Get started in minutes, not months</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple setup process to get your entire restaurant operation connected and visible.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect Your Data",
                description: "Integrate with your POS, inventory, and scheduling systems. We support 50+ integrations.",
                icon: Globe,
              },
              {
                step: "02",
                title: "Configure Dashboards",
                description: "Customize views for each role - from CEO overview to branch manager details.",
                icon: BarChart3,
              },
              {
                step: "03",
                title: "Start Optimizing",
                description: "Get instant insights and automated alerts. Make data-driven decisions daily.",
                icon: Zap,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-muted/20 mb-4">{item.step}</div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                </div>
                <p className="text-muted-foreground">{item.description}</p>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-4 h-8 w-8 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "500+", label: "Restaurant Chains" },
              { value: "15K+", label: "Branches Connected" },
              { value: "$2.5B", label: "Revenue Tracked" },
              { value: "99.9%", label: "Uptime SLA" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-blue-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by restaurant leaders</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Dinelytix transformed how we manage our 50+ locations. We reduced waste by 25% in the first quarter.",
                author: "Sarah Chen",
                role: "CEO, Golden Dragon Group",
                rating: 5,
              },
              {
                quote: "The real-time alerts have been a game-changer. We catch issues before they become problems.",
                author: "Michael Rodriguez",
                role: "COO, Urban Eats Co",
                rating: 5,
              },
              {
                quote: "Finally, a platform that gives me the visibility I need without the complexity I don't.",
                author: "Jennifer Park",
                role: "VP Operations, Fresh Kitchen",
                rating: 5,
              },
            ].map((testimonial, i) => (
              <Card key={i} className="bg-card">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-muted-foreground/20 mb-4" />
                  <p className="text-foreground mb-6">{testimonial.quote}</p>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl bg-gradient-to-r from-blue-600 to-blue-700 p-12 md:p-16 text-center text-white overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to transform your restaurant operations?
              </h2>
              <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
                Join 500+ restaurant chains already using Dinelytix to optimize their operations and boost profitability.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-12 px-8 text-base border-white/30 text-white hover:bg-white/10">
                  Schedule Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Dinelytix</span>
              </div>
              <p className="text-muted-foreground mb-4 max-w-xs">
                Smart intelligence for modern restaurants. Real-time analytics for data-driven decisions.
              </p>
              <div className="flex gap-4">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">SOC 2 Certified</span>
              </div>
            </div>
            
            {[
              { title: "Product", links: ["Features", "Pricing", "Integrations", "API"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Resources", links: ["Documentation", "Help Center", "Status", "Security"] },
            ].map((section, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
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
      <div className={`rounded-xl bg-gradient-to-br ${gradient} p-3 w-fit mb-4 shadow-lg`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
