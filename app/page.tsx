import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EXCELITE_BRAND } from "@/lib/excelite-config";
import { RevealOnScroll } from "@/components/marketing/reveal-on-scroll";
import {
  ArrowRight,
  BarChart3,
  Monitor,
  Package,
  Rocket,
  Settings,
  ShoppingCart,
  Sparkles,
  Zap,
} from "lucide-react";

const CONTACT_TEL = EXCELITE_BRAND.supportPhoneTel;
const CONTACT_PHONE_LABEL = EXCELITE_BRAND.supportPhoneDisplay;

const benefits = [
  {
    title: "Simple setup",
    description:
      "Add your products, connect a receipt printer, and start selling the same day. No complicated onboarding.",
    icon: Settings,
  },
  {
    title: "Sell fast",
    description:
      "A clean checkout screen helps your team ring up orders quickly—cash, card, or mobile money.",
    icon: ShoppingCart,
  },
  {
    title: "Track stock",
    description:
      "Stock levels update with every sale so you know what to reorder before you run out.",
    icon: Package,
  },
  {
    title: "Daily sales",
    description:
      "See today's revenue, top sellers, and payment totals at a glance—no spreadsheets required.",
    icon: BarChart3,
  },
];

const steps = [
  {
    step: "1",
    title: "Create your account",
    description: "Sign up, add your business details, and invite your team in minutes.",
  },
  {
    step: "2",
    title: "Add your menu & stock",
    description: "Upload products or enter them manually. Set prices and starting quantities.",
  },
  {
    step: "3",
    title: "Start selling",
    description: "Open the POS, take orders, and watch your sales dashboard update in real time.",
  },
];

const featuredFaqs = [
  {
    question: "What is Excelite POS?",
    answer:
      "Excelite POS is point-of-sale software built for small shops and local businesses. It handles checkout, inventory, and daily sales in one simple system.",
  },
  {
    question: "Do I need technical skills?",
    answer:
      "No. Excelite is designed for shop owners and cashiers—not IT teams. Most businesses are up and running within a day.",
  },
  {
    question: "What payments can I accept?",
    answer:
      "Record cash, mobile money, and card payments at checkout. Every transaction is logged automatically.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#222831] overflow-x-hidden">
      {/* Header — glass sticky nav */}
      <header className="sticky top-0 z-50 w-full border-b border-white/20 excelite-glass">
        <div className="container mx-auto px-4 lg:px-8">
          <nav className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
              <div className="relative animate-excelite-float">
                <Image
                  src={EXCELITE_BRAND.logo}
                  alt={EXCELITE_BRAND.name}
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain transition-transform duration-300 group-hover:scale-105"
                  priority
                />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Excelite <span className="text-[#22C55E]">POS</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {[
                { href: "#benefits", label: "Benefits" },
                { href: "#how-it-works", label: "How it works" },
                { href: "/faq", label: "FAQ" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-[#222831]/70 hover:text-[#22C55E] transition-colors duration-200 cursor-pointer"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/login" className="hidden sm:block cursor-pointer">
                <Button variant="ghost" size="sm" className="font-medium">
                  Sign in
                </Button>
              </Link>
              <Link href="/login" className="cursor-pointer">
                <Button
                  size="sm"
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium shadow-md shadow-[#22C55E]/20 transition-all duration-200 hover:shadow-lg hover:shadow-[#22C55E]/30"
                >
                  Get started
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#222831]/5 excelite-hero-bg">
        <div className="excelite-orb excelite-orb-green w-[420px] h-[420px] -top-32 -right-32 animate-excelite-pulse-ring" />
        <div className="excelite-orb excelite-orb-green w-[280px] h-[280px] bottom-0 left-[-80px] animate-excelite-float-slow opacity-60" />
        <div className="excelite-orb excelite-orb-charcoal w-[200px] h-[200px] top-1/3 right-1/4 animate-excelite-float opacity-40" />

        <div className="container relative mx-auto px-4 lg:px-8 py-16 md:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <div className="opacity-0 animate-excelite-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full excelite-glass-green text-[#16A34A] text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              Built for small businesses
            </div>

            <h1 className="opacity-0 animate-excelite-fade-up animation-delay-100 text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              {EXCELITE_BRAND.tagline}
            </h1>

            <p className="opacity-0 animate-excelite-fade-up animation-delay-200 text-lg md:text-xl text-[#222831]/70 mb-10 max-w-2xl mx-auto leading-relaxed">
              Run your shop from one place—checkout, inventory, and daily sales
              reports without the complexity of enterprise software.
            </p>

            <div className="opacity-0 animate-excelite-fade-up animation-delay-300 flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/login" className="cursor-pointer">
                <Button
                  size="lg"
                  className="h-13 px-8 bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium w-full sm:w-auto shadow-lg shadow-[#22C55E]/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#22C55E]/30"
                >
                  Start selling today
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-13 px-8 excelite-glass border-[#222831]/10 hover:bg-white/80 w-full sm:w-auto transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                asChild
              >
                <a href={CONTACT_TEL}>Call {CONTACT_PHONE_LABEL}</a>
              </Button>
            </div>

            {/* Hero glass preview card */}
            <div className="opacity-0 animate-excelite-scale-in animation-delay-500 max-w-lg mx-auto">
              <div className="excelite-glass excelite-shimmer-border rounded-2xl p-6 text-left">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-[#22C55E]/15 flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-[#22C55E]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Today&apos;s snapshot</p>
                    <p className="text-xs text-[#222831]/50">Live from your dashboard</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
                    </span>
                    <span className="text-xs text-[#22C55E] font-medium">Live</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Revenue", value: "₵ 2,450" },
                    { label: "Orders", value: "38" },
                    { label: "Top item", value: "Coffee" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl bg-white/60 border border-white/80 px-3 py-2.5"
                    >
                      <p className="text-[10px] uppercase tracking-wide text-[#222831]/45">
                        {stat.label}
                      </p>
                      <p className="font-bold text-sm mt-0.5">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="opacity-0 animate-excelite-fade-up animation-delay-500 mt-10 text-sm text-[#222831]/55">
              No long contracts · Works on tablet or desktop · Friendly support
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-16 md:py-24 relative">
        <div className="absolute inset-0 bg-linear-to-b from-[#22C55E]/[0.03] to-transparent pointer-events-none" />
        <div className="container relative mx-auto px-4 lg:px-8">
          <RevealOnScroll className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Everything you need to run your shop
            </h2>
            <p className="text-[#222831]/70">
              Focus on serving customers—not wrestling with complicated software.
            </p>
          </RevealOnScroll>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {benefits.map((item, i) => (
              <RevealOnScroll key={item.title} delay={i * 80}>
                <div className="excelite-glass rounded-2xl p-6 h-full transition-all duration-300 hover:shadow-lg hover:shadow-[#22C55E]/10 hover:-translate-y-1 cursor-default group">
                  <div className="w-11 h-11 rounded-xl bg-[#22C55E]/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#22C55E]/15">
                    <item.icon className="h-5 w-5 text-[#22C55E]" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-[#222831]/70 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-[#222831]/[0.02]">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <RevealOnScroll className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">How it works</h2>
            <p className="text-[#222831]/70">
              Three steps from sign-up to your first sale.
            </p>
          </RevealOnScroll>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-5 left-[16%] right-[16%] h-px bg-linear-to-r from-transparent via-[#22C55E]/30 to-transparent" />

            {steps.map((item, i) => (
              <RevealOnScroll key={item.step} delay={i * 120} className="relative">
                <div className="text-center md:text-left excelite-glass rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-1">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#222831] text-white font-bold text-sm mb-4 shadow-lg shadow-[#222831]/20">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-[#222831]/70 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="py-16 md:py-20 border-y border-[#222831]/10">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <RevealOnScroll className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Common questions</h2>
            <p className="text-[#222831]/70">
              Quick answers for shop owners considering Excelite POS.
            </p>
          </RevealOnScroll>

          <div className="space-y-4 mb-8">
            {featuredFaqs.map((item, i) => (
              <RevealOnScroll key={item.question} delay={i * 60}>
                <div className="excelite-glass rounded-xl p-5 transition-all duration-300 hover:shadow-md hover:shadow-[#22C55E]/5">
                  <h3 className="font-medium mb-2">{item.question}</h3>
                  <p className="text-sm text-[#222831]/70 leading-relaxed">{item.answer}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          <RevealOnScroll className="text-center">
            <Button
              asChild
              variant="outline"
              className="excelite-glass border-[#222831]/10 hover:bg-white/90 cursor-pointer"
            >
              <Link href="/faq">
                View all FAQs
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </RevealOnScroll>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <RevealOnScroll>
            <div className="relative rounded-3xl excelite-glass-dark px-8 py-12 md:px-16 md:py-16 text-center text-white overflow-hidden">
              <div className="excelite-orb excelite-orb-green w-64 h-64 top-0 right-0 animate-excelite-pulse-ring" />
              <div className="excelite-orb excelite-orb-green w-48 h-48 bottom-0 left-0 animate-excelite-float-slow opacity-50" />
              <div className="relative max-w-2xl mx-auto">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#22C55E]/20 border border-[#22C55E]/30 mb-6 animate-excelite-float">
                  <Rocket className="h-7 w-7 text-[#22C55E]" />
                </div>
                <h2 className="text-2xl md:text-4xl font-bold mb-4">
                  Ready to simplify your checkout?
                </h2>
                <p className="text-white/70 mb-8">
                  Join small businesses using Excelite POS to sell faster and stay
                  on top of stock and sales.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/login" className="cursor-pointer">
                    <Button
                      size="lg"
                      className="h-12 px-8 bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium w-full sm:w-auto shadow-lg shadow-[#22C55E]/30 transition-all duration-300 hover:scale-[1.02]"
                    >
                      Go to login
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="lg"
                    className="h-12 px-8 bg-white text-[#222831] hover:bg-white/90 font-medium w-full sm:w-auto shadow-sm cursor-pointer"
                    asChild
                  >
                    <a href={CONTACT_TEL}>Call {CONTACT_PHONE_LABEL}</a>
                  </Button>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <footer className="py-8 border-t border-[#222831]/10 text-center text-sm text-[#222831]/50">
        <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/faq" className="hover:text-[#22C55E] transition-colors cursor-pointer">
            FAQ
          </Link>
          <Link href="/login" className="hover:text-[#22C55E] transition-colors cursor-pointer">
            Login
          </Link>
          <a href={CONTACT_TEL} className="hover:text-[#22C55E] transition-colors cursor-pointer">
            Contact
          </a>
          <span>© {new Date().getFullYear()} Excelite POS</span>
        </div>
      </footer>
    </div>
  );
}
