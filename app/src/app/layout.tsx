import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
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

export const metadata: Metadata = {
  title: "VERSUS — comparatore luce e gas",
  description:
    "Confronta le offerte luce e gas per la tua casa o la tua attività e scegli la più conveniente.",
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
