import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SERVGO_BRAND } from "@/lib/brand-config";
import { BookDemoForm } from "@/components/marketing/book-demo-form";

export const metadata = {
  title: "Book a Demo | ServGo",
  description:
    "See how ServGo can work for your business. Choose a convenient time and tell us a little about your business.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white text-[#001F5C]">
      <header className="sticky top-0 z-50 w-full border-b border-[#001F5C]/10 bg-white/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 lg:px-8">
          <nav className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src={SERVGO_BRAND.logo}
                alt={SERVGO_BRAND.name}
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
              <span className="text-lg font-bold tracking-tight">
                ServGo <span className="text-[#0066FF]">POS</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">Home</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-[#0066FF] hover:bg-[#0052CC] text-white"
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
            <p className="text-sm font-medium text-[#0066FF] mb-2">Book a Demo</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              See ServGo in action
            </h1>
            <p className="text-[#001F5C]/70 leading-relaxed">
              See how ServGo can work for your business. Choose a convenient
              time and tell us a little about your business so we can make the
              demo relevant to you.
            </p>
          </div>

          <div className="rounded-2xl border border-[#001F5C]/10 bg-white p-6 md:p-8 shadow-sm">
            <BookDemoForm />
          </div>
        </div>
      </main>

      <footer className="py-8 border-t border-[#001F5C]/10 text-center text-sm text-[#001F5C]/50">
        <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/faq" className="hover:text-[#0066FF] transition-colors">
            FAQ
          </Link>
          <a
            href={SERVGO_BRAND.supportWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#0066FF] transition-colors"
          >
            Contact
          </a>
          <span>© {new Date().getFullYear()} ServGo</span>
        </div>
      </footer>
    </div>
  );
}
