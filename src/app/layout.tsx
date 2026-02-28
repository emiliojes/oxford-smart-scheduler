import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/context/LanguageContext";
import { Header } from "@/components/Header";
import { validateRequest } from "@/lib/auth-utils";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Oxford School Schedule Manager",
  description: "Intelligent school schedule management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await validateRequest();
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || "";

  // Redirect PENDING users away from all pages except /pending and /login
  if (user && (user as any).status === "PENDING" && !pathname.startsWith("/pending")) {
    redirect("/pending");
  }

  const authUser = user
    ? { username: user.username, role: (user as any).role, status: (user as any).status ?? "ACTIVE", teacherId: (user as any).teacherId ?? null }
    : null;

  // PENDING users: show a minimal layout without header/nav
  if (user && (user as any).status === "PENDING") {
    return (
      <html lang="en">
        <body className={`${inter.className} antialiased`}>
          <LanguageProvider>
            <AuthProvider user={authUser}>
              {children}
            </AuthProvider>
          </LanguageProvider>
          <Toaster position="top-right" />
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <LanguageProvider>
          <AuthProvider user={authUser}>
          <TooltipProvider>
            <div className="min-h-screen flex flex-col">
              <Header user={user} />
              <main className="flex-1 container mx-auto py-8 px-4">
                {children}
              </main>
              <footer className="border-t p-4 text-center text-gray-500 text-sm">
                2026 Oxford School Schedule Manager
              </footer>
            </div>
          </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
