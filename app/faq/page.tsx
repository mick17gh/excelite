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

const CONTACT_TEL = EXCELITE_BRAND.supportPhoneTel;
const CONTACT_PHONE_LABEL = EXCELITE_BRAND.supportPhoneDisplay;

const faqs: Array<{ question: string; answer: string }> = [
  {
    question: "What is Excelite POS?",
    answer:
      "Excelite POS is point-of-sale software for small shops and local businesses. It helps you ring up sales, track inventory, and review daily performance from one dashboard.",
  },
  {
    question: "Who is Excelite POS for?",
    answer:
      "It is built for small business owners—retail shops, cafés, kiosks, and single-location stores that want a straightforward POS without enterprise complexity.",
  },
  {
    question: "Do I need technical skills to use it?",
    answer:
      "No. Excelite is designed for shop owners and cashiers. If you can use a smartphone or tablet, you can use Excelite POS.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most businesses add their products and start selling within a day. Our team can walk you through setup if you prefer guided help.",
  },
  {
    question: "What devices do I need?",
    answer:
      "Excelite runs in your web browser on a tablet, laptop, or desktop. A receipt printer is optional but recommended for customer receipts.",
  },
  {
    question: "Can I accept cash and mobile money?",
    answer:
      "Yes. Record cash, mobile money, and card payments at checkout. Every payment type is tracked in your sales reports.",
  },
  {
    question: "Does inventory update automatically?",
    answer:
      "Yes. When you sell an item, stock levels decrease automatically so you always know what is left on the shelf.",
  },
  {
    question: "Can I see my daily sales?",
    answer:
      "Yes. Your dashboard shows today's revenue, transaction count, and payment breakdown—updated as you sell throughout the day.",
  },
  {
    question: "Can multiple staff use the system?",
    answer:
      "Yes. Add team members with their own login. Owners and managers can control who has access to the POS and settings.",
  },
  {
    question: "Can I switch from my current POS?",
    answer:
      "Yes. We help you move product lists and get your team comfortable with Excelite so the transition is smooth.",
  },
  {
    question: "Will I lose my data when switching?",
    answer:
      "We work with you to import product and stock data where possible so you do not start from scratch.",
  },
  {
    question: "Is my business data safe?",
    answer:
      "Yes. Your sales and inventory data is stored securely. Only people you authorize can access your account.",
  },
  {
    question: "What if I need help after setup?",
    answer:
      "Reach out anytime by email. We are here to answer questions and keep your shop running smoothly.",
  },
  {
    question: "How do I get started?",
    answer:
      "Create an account, add your products, and open the POS screen. You can sign up from the Get started button on our homepage.",
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
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="font-medium">
                  Sign in
                </Button>
              </Link>
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
              Questions from small business owners
            </h1>
            <p className="text-[#222831]/70 max-w-2xl">
              Setup, daily operations, payments, and support—everything you need
              to know about Excelite POS.
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
            <h2 className="font-semibold text-lg mb-2">Still have questions?</h2>
            <p className="text-sm text-[#222831]/70 mb-6">
              Our team is happy to help you decide if Excelite POS is right for
              your shop.
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
                <Link href="/login">Get started</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="text-[#222831]/70 w-full sm:w-auto"
              >
                <a href={CONTACT_TEL}>Call {CONTACT_PHONE_LABEL}</a>
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
              <Link href="/login" className="hover:text-[#222831] transition-colors">
                Login
              </Link>
              <a
                href={CONTACT_TEL}
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
