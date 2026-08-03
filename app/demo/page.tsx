import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EXCELITE_BRAND } from "@/lib/excelite-config";
import { BookDemoForm } from "@/components/marketing/book-demo-form";

export const metadata = {
  title: "Book a Demo | Excelite POS",
  description:
    "See how Excelite can work for your business. Choose a convenient time and tell us a little about your business.",
};

export default function DemoPage() {
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
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">Home</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
              >
                <Link href="/login">Get started</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="py-12 md:py-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-2xl">
          <div className="mb-8 text-center md:text-left">
            <p className="text-sm font-medium text-[#22C55E] mb-2">Book a Demo</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              See Excelite in action
            </h1>
            <p className="text-[#222831]/70 leading-relaxed">
              See how Excelite can work for your business. Choose a convenient
              time and tell us a little about your business so we can make the
              demo relevant to you.
            </p>
          </div>

          <div className="rounded-2xl border border-[#222831]/10 bg-white p-6 md:p-8 shadow-sm">
            <BookDemoForm />
          </div>
        </div>
      </main>

      <footer className="py-8 border-t border-[#222831]/10 text-center text-sm text-[#222831]/50">
        <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/faq" className="hover:text-[#22C55E] transition-colors">
            FAQ
          </Link>
          <a
            href={EXCELITE_BRAND.supportWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#22C55E] transition-colors"
          >
            Contact
          </a>
          <span>© {new Date().getFullYear()} Excelite POS</span>
        </div>
      </footer>
    </div>
  );
}
