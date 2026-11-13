import type { Metadata, Viewport } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import { Providers } from "@/components/providers";
import { SERVGO_BRAND } from "@/lib/brand-config";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  applicationName: SERVGO_BRAND.name,
  title: {
    default: `${SERVGO_BRAND.name} — ${SERVGO_BRAND.tagline}`,
    template: `%s | ${SERVGO_BRAND.name}`,
  },
  description:
    "Simple point-of-sale software for small businesses. Sell in minutes, track orders, manage products and inventory from one easy dashboard.",
  keywords: ["POS", "point of sale", "small business", "inventory", "retail", "restaurant POS"],
  icons: {
    icon: "/servgo.jpeg",
    shortcut: "/servgo.jpeg",
    apple: "/servgo.jpeg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SERVGO_BRAND.shortName,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: SERVGO_BRAND.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${openSans.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
