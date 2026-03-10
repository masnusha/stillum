import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  preload: false, // avoids network fetch during CI/Railway build
});

export const metadata: Metadata = {
  title: "Stillum",
  description: "A premium, curated audio space for your music library.",
};

export const viewport: Viewport = {
  themeColor: "#050A15",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
