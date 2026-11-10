import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { SITE_URL } from "@/lib/seo/site";
import "./globals.css";

// Self-hosted at build time by next/font: no runtime request to Google.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Variable font with the width axis: `font-stretch: 125%` gives the wide display look.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

const TITLE = "VERSUS — comparatore luce e gas";
const DESCRIPTION =
  "Confronta le offerte luce e gas per la tua casa o la tua attività e scegli la più conveniente.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "VERSUS — comparatore luce e gas",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a8045",
};

export default function RootLayout({ children }: {
  children: ReactNode;
}) {
  return (
    <html lang="it" className={`${inter.variable} ${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface-muted text-ink">{children}</body>
    </html>
  );
}
