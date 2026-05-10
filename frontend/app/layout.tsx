import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SentinelReview | AI Agentic Infrastructure",
  description: "Advanced AI-powered code analysis and security auditing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased`}>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,#0ea5e915,transparent)] pointer-events-none" />
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}