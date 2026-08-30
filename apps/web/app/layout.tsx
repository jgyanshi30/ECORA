import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { cn } from "@/lib/utils";

import "./globals.css";

// CLAUDE.md §2: Inter typography.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ecora",
  description: "Report, AI-detect, and manage underwater and environmental debris complaints.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(inter.variable)}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
