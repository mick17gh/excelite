import type { Metadata, Viewport } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import { Providers } from "@/components/providers";
import { EXCELITE_BRAND } from "@/lib/excelite-config";
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
  applicationName: EXCELITE_BRAND.name,
  title: {
    default: `${EXCELITE_BRAND.name} — ${EXCELITE_BRAND.tagline}`,
    template: `%s | ${EXCELITE_BRAND.name}`,
  },
  description:
    "Simple point-of-sale software for small businesses. Sell in minutes, track orders, manage products and inventory from one easy dashboard.",
  keywords: ["POS", "point of sale", "small business", "inventory", "retail", "restaurant POS"],
  icons: {
    icon: "/excelite_logo.png",
    shortcut: "/excelite_logo.png",
    apple: "/excelite_logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: EXCELITE_BRAND.shortName,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: EXCELITE_BRAND.themeColor,
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
