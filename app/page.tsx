import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EXCELITE_BRAND } from "@/lib/excelite-config";
import { RevealOnScroll } from "@/components/marketing/reveal-on-scroll";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Package,
  Rocket,
  Sparkles,
  WifiOff,
} from "lucide-react";

const WHATSAPP_URL = EXCELITE_BRAND.supportWhatsAppUrl;

const positioningCards = [
  {
    title: "Sell Easily",
    description:
      "Take orders and payments quickly, even when the internet goes off.",
    icon: WifiOff,
  },
  {
    title: "Know Your Sales",
    description: "See how much you've sold and how your business is doing.",
    icon: BarChart3,
  },
  {
    title: "Keep Track of Stock",
    description:
      "Know what you have, what's selling and what needs to be replaced.",
    icon: Package,
  },
  {
    title: "Bank-Ready Sales Records",
    description:
      "Generate trusted sales reports that make it easy for banks to approve loans for your business.",
    icon: FileText,
  },
];

const steps = [
  {
    step: "1",
    title: "Sign Up",
    description:
      "Set up your account, enter your business details, add your staff in minutes.",
  },
  {
    step: "2",
    title: "Add your menu & stock",
    description:
      "Upload products or enter them manually. Set prices and starting quantities.",
  },
  {
    step: "3",
    title: "Start selling",
    description:
      "Open the POS, take orders, and watch your sales dashboard update in real time.",
  },
];

const featuredFaqs = [
  {
    question: "What is Excelite?",
    answer:
      "Excelite is a simple business management and POS system built for small and growing food and retail businesses. It helps you take sales, manage orders, keep track of stock and see how your business is doing—all in one place.",
  },
  {
    question: "Can I still sell if my internet goes off?",
    answer:
      "Yes. Excelite's offline mode allows you to continue taking sales even when your internet connection is down. Once your connection comes back, your sales sync automatically.",
  },
  {
    question: "Will my staff find Excelite difficult to use?",
    answer:
      "No. Excelite is designed to be easy to learn and easy to use. No IT background or technical skill required.",
  },
  {
    question: "How do I get started with Excelite?",
    answer:
      'Getting started is simple. You can Book a demo to see how Excelite works, or Get Started to begin your account creation.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#222831] overflow-x-hidden">
      {/* Header */}
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
                { href: "#positioning", label: "Learn More" },
                { href: "#faq", label: "FAQ" },
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

        <div className="container relative mx-auto px-4 lg:px-8 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="opacity-0 animate-excelite-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full excelite-glass-green text-[#16A34A] text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              Built for your business
            </div>

            <h1 className="opacity-0 animate-excelite-fade-up animation-delay-100 text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Run Your Business. Know Your Numbers.
            </h1>

            <p className="opacity-0 animate-excelite-fade-up animation-delay-200 text-lg md:text-xl text-[#222831]/70 mb-10 max-w-2xl mx-auto leading-relaxed">
              Excelite helps you sell, manage your shop, track your stock and see
              how your business is doing—all in one simple system.
            </p>

            <div className="opacity-0 animate-excelite-fade-up animation-delay-300 flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <Button
                size="lg"
                className="h-13 px-8 bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium w-full sm:w-auto shadow-lg shadow-[#22C55E]/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#22C55E]/30 cursor-pointer"
                asChild
              >
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Chat on WhatsApp
                  <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 px-8 excelite-glass border-[#222831]/10 hover:bg-white/80 w-full sm:w-auto transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                asChild
              >
                <Link href="/demo">Book a Demo</Link>
              </Button>
            </div>

            <p className="opacity-0 animate-excelite-fade-up animation-delay-300 text-sm text-[#222831]/55 mb-10">
              Easy to understand. Simple to use. Built for your business
            </p>

            <div className="opacity-0 animate-excelite-scale-in animation-delay-500 max-w-5xl mx-auto">
              <div className="relative w-full overflow-hidden rounded-2xl border border-[#222831]/8 shadow-xl shadow-[#222831]/10 bg-white">
                <Image
                  src="/Picture1.png"
                  alt="Excelite owner dashboard showing live sales, orders, and inventory insights"
                  width={1600}
                  height={1000}
                  className="w-full h-auto object-contain"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1024px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Positioning */}
      <section id="positioning" className="py-16 md:py-24 relative scroll-mt-20">
        <div className="absolute inset-0 bg-linear-to-b from-[#22C55E]/[0.03] to-transparent pointer-events-none" />
        <div className="container relative mx-auto px-4 lg:px-8">
          <RevealOnScroll className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Everything You Need. Nothing You Don&apos;t.
            </h2>
            <p className="text-[#222831]/70 leading-relaxed">
              Running a business is already hard. Your software shouldn&apos;t make
              it harder. Excelite gives you the tools you need to run your
              day-to-day business without complicated features you may never use.
            </p>
          </RevealOnScroll>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {positioningCards.map((item, i) => (
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
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Easy to Setup and Use
            </h2>
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
      <section id="faq" className="py-16 md:py-20 border-y border-[#222831]/10 scroll-mt-20">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <RevealOnScroll className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Simple Answers. Clear Choices.
            </h2>
            <p className="text-[#222831]/70">
              Quick answers for business owners considering Excelite.
            </p>
          </RevealOnScroll>

          <div className="space-y-4 mb-8">
            {featuredFaqs.map((item, i) => (
              <RevealOnScroll key={item.question} delay={i * 60}>
                <div className="excelite-glass rounded-xl p-5 transition-all duration-300 hover:shadow-md hover:shadow-[#22C55E]/5">
                  <h3 className="font-medium mb-2">{item.question}</h3>
                  <p className="text-sm text-[#222831]/70 leading-relaxed">
                    {item.answer}
                  </p>
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
                  Trusted by 800+ Businesses. Grow with Excelite
                </h2>
                <p className="text-white/70 mb-8">
                  Excelite helps you make more from every sale, reduce waste and
                  protect your profit.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/login" className="cursor-pointer">
                    <Button
                      size="lg"
                      className="h-12 px-8 bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium w-full sm:w-auto shadow-lg shadow-[#22C55E]/30 transition-all duration-300 hover:scale-[1.02]"
                    >
                      Get Started
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="lg"
                    className="h-12 px-8 bg-white text-[#222831] hover:bg-white/90 font-medium w-full sm:w-auto shadow-sm cursor-pointer"
                    asChild
                  >
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                      Chat on WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <footer className="py-8 border-t border-[#222831]/10 text-center text-sm text-[#222831]/50">
        <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="#faq" className="hover:text-[#22C55E] transition-colors cursor-pointer">
            FAQ
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#22C55E] transition-colors cursor-pointer"
          >
            Contact
          </a>
          <span>© {new Date().getFullYear()} Excelite POS</span>
        </div>
      </footer>
    </div>
  );
}
