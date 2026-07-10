import type { Metadata } from "next";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-Powered CSV Lead Importer | GrowEasy CRM",
  description: "Intelligently parse, clean, and map marketing lead CSV files from Facebook, Google Ads, and other sources using advanced AI mapping.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

