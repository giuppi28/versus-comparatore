import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface text-ink">{children}</body>
    </html>
  );
}
