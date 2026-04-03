import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "ServStack — QSR Operating System for Visibility, Control & Profitability",
  description:
    "Expose hidden revenue leaks, run kitchens and inventory in real time, and manage multi-branch performance from one unified platform built for QSR.",
  keywords: ["restaurant analytics", "restaurant management", "sales analytics", "inventory management", "staff management"],
  icons: {
    icon: "/favv.png",
    shortcut: "/favv.png",
    apple: "/favv.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
