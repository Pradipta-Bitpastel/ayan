import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ayanhore.com"),
  title: "Ayan Hore — Thought Leader · Photographer (AFIP)",
  description:
    "Ayan Hore builds products and photographs light. CEO & co-founder of Bitpastel, AFIP-distinguished photographer and founder of AyaN Photography. Two crafts, one eye.",
  keywords: [
    "Ayan Hore",
    "Bitpastel",
    "AyaN Photography",
    "AFIP",
    "digital transformation",
    "product development",
    "photographer",
  ],
  authors: [{ name: "Ayan Hore" }],
  openGraph: {
    title: "Ayan Hore — Thought Leader · Photographer (AFIP)",
    description:
      "I build products and I photograph light. Same discipline, different lens.",
    type: "profile",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geistMono.variable}>
      <body>
        {/* Next 16 hoists these into <head> automatically. */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&f[]=general-sans@400,500,600&display=swap"
        />
        {/* Wordmark display face — a cooler, more distinctive grotesk for the hero. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap"
        />
        {children}
      </body>
    </html>
  );
}
