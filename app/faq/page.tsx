import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TrendingUp, Shield } from "lucide-react";

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
    answer: "Yes. The Pro tier includes an AI assistant built directly into your system.",
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

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 lg:px-8">
          <nav className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/30">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">ServStack</span>
            </Link>

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

      <main className="py-16 md:py-20">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">
              FAQ
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">ServStack FAQ</h1>
            <p className="text-muted-foreground">
              Everything you need to know about setup, operations, growth, and support.
            </p>
          </div>

          <Card>
            <CardContent className="p-4 md:p-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((item, index) => (
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
            </CardContent>
          </Card>

          <div className="mt-8 flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get started</Link>
            </Button>
          </div>
        </div>
      </main>

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
                The unified operating system for QSR: orders, kitchen, inventory, and insights in one place.
              </p>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-muted-foreground">Enterprise-grade security</span>
              </div>
            </div>

            {[
              {
                title: "Product",
                links: [
                  { label: "Profitability", href: "/#features" },
                  { label: "Pricing", href: "/#pricing" },
                  { label: "Testimonials", href: "/#testimonials" },
                  { label: "FAQ", href: "/faq" },
                ],
              },
              { title: "Company", links: [{ label: "About", href: "/#about" }] },
              {
                title: "Support",
                links: [
                  { label: "Help Center", href: "#" },
                  { label: "Documentation", href: "#" },
                ],
              },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
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
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
