import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/context/LanguageContext";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Oxford School Schedule Manager",
  description: "Intelligent school schedule management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <LanguageProvider>
          <TooltipProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1 container mx-auto py-8 px-4">
                {children}
              </main>
              <footer className="border-t p-4 text-center text-gray-500 text-sm">
                2026 Oxford School Schedule Manager
              </footer>
            </div>
          </TooltipProvider>
        </LanguageProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
