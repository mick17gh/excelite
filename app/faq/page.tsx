import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EXCELITE_BRAND } from "@/lib/excelite-config";

const WHATSAPP_URL = EXCELITE_BRAND.supportWhatsAppUrl;

const faqs: Array<{ question: string; answer: string }> = [
  {
    question: "What is Excelite?",
    answer:
      "Excelite is a simple business management and POS system built for small and growing food and retail businesses. It helps you take sales, manage orders, keep track of stock and see how your business is doing—all in one place.",
  },
  {
    question: "Why should I choose Excelite instead of another POS?",
    answer:
      "Excelite is built with the needs of Ghanaian businesses in mind. While many POS systems are designed for a broad international market, Excelite focuses on the way businesses here actually operate. You get the essential tools you need to run your business without paying for complicated features you may never use. Excelite is simple to learn, easy to use and affordable, while giving you the information you need to stay in control.",
  },
  {
    question: "Can I still sell if my internet goes off?",
    answer:
      "Yes. Excelite's offline mode allows you to continue taking sales even when your internet connection is down. Once your connection comes back, your sales sync automatically. Your business doesn't have to stop because the internet does.",
  },
  {
    question: "Will my staff find Excelite difficult to use?",
    answer:
      "No. Excelite is designed to be easy to learn and easy to use. No IT background or technical skill required. The system keeps the features and processes straightforward, so staff can quickly understand how to take orders, complete sales and carry out their daily tasks to help your business grow.",
  },
  {
    question: "Can Excelite help me keep track of my orders and payments?",
    answer:
      "Yes. Excelite gives you a clear view of your orders, including dine-in, takeout and delivery orders. You can also see how customers paid (Cash, MoMo, Card), helping you keep better track of your sales and payments. This gives you a clearer picture of what is happening across your business throughout the day.",
  },
  {
    question: "Can Excelite help me keep track of my stock?",
    answer:
      "Yes. Excelite helps you keep track of your stock, see what is selling and get alerts when important items are running low. This helps you avoid unnecessary shortages and reduce waste.",
  },
  {
    question: "Can Excelite help me prove how my business is performing?",
    answer:
      "Yes. The reports in Excelite give you a clear record of your business performance, including sales and other important business information. These reports can help you make better decisions about your business and provide useful records when you need to demonstrate your business activity—for example, when applying for bank loans or government credit.",
  },
  {
    question: "Is Excelite only for restaurants?",
    answer:
      "No. Excelite is built for single-branch food and retail businesses. It can be useful for Fast Food Outlets, Local Eateries, Cafés, Provisions & Grocery Stores, Cold store, Hardware Stores, Boutiques & Beauty Shops, Electronics Stores, Chemist Shops, Household Item Stores and other small businesses that need a simple way to manage sales, orders and stock. Contact us if you have multiple branches and need a reliable alternative.",
  },
  {
    question: "Is Excelite difficult to set up and learn?",
    answer:
      "Not at all. Excelite is designed to get your business up and running quickly. The setup is straightforward, and the system focuses on simple, practical features that your business needs every day. All you need is an internet capable tablet or POS device. Your team can learn the basics quickly, and reliable customer support is available whenever you need help.",
  },
  {
    question: "How do I get started with Excelite?",
    answer:
      "Getting started is simple. You can Book a demo to see how Excelite works and discuss what your business needs, or Get Started to start your account creation. Ready to run your business with less stress? Contact us today via WhatsApp.",
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white text-[#222831]">
      <header className="sticky top-0 z-50 w-full border-b border-[#222831]/10 bg-white/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 lg:px-8">
          <nav className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src={EXCELITE_BRAND.logo}
                alt={EXCELITE_BRAND.name}
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
              <span className="text-lg font-bold tracking-tight">
                Excelite <span className="text-[#22C55E]">POS</span>
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/login">
                <Button
                  size="sm"
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium shadow-sm"
                >
                  Get started
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="py-16 md:py-20">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <div className="mb-10 text-center md:text-left">
            <p className="text-sm font-medium text-[#22C55E] mb-2">FAQ</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Simple Answers. Clear Choices.
            </h1>
            <p className="text-[#222831]/70 max-w-2xl">
              Everything you need to know about Excelite—setup, sales, stock,
              and support.
            </p>
          </div>

          <Card className="border-[#222831]/10">
            <CardContent className="p-4 md:p-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((item, index) => (
                  <AccordionItem key={item.question} value={`faq-${index}`}>
                    <AccordionTrigger className="text-base font-medium text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-[#222831]/70 leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <div className="mt-10 rounded-xl bg-[#222831]/[0.03] border border-[#222831]/10 p-6 md:p-8 text-center">
            <h2 className="font-semibold text-lg mb-2">
              Ready to run your business with less stress?
            </h2>
            <p className="text-sm text-[#222831]/70 mb-6">
              Contact us today via WhatsApp, book a demo, or get started with
              your account.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                variant="outline"
                className="border-[#222831]/20 hover:bg-[#222831]/5 w-full sm:w-auto"
              >
                <Link href="/">Back to home</Link>
              </Button>
              <Button
                asChild
                className="bg-[#22C55E] hover:bg-[#16A34A] text-white w-full sm:w-auto"
              >
                <Link href="/login">Get Started</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="text-[#222831]/70 w-full sm:w-auto"
              >
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Chat on WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-10 border-t border-[#222831]/10">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src={EXCELITE_BRAND.logo}
                alt={EXCELITE_BRAND.name}
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
              <span className="font-semibold">Excelite POS</span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-[#222831]/60">
              <Link href="/" className="hover:text-[#222831] transition-colors">
                Home
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#222831] transition-colors"
              >
                Contact
              </a>
            </div>
            <p className="text-sm text-[#222831]/50">
              © {new Date().getFullYear()} Excelite POS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
