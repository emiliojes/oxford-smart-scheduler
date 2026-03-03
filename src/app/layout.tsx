import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/context/LanguageContext";
import { Header } from "@/components/Header";
import { validateRequest } from "@/lib/auth-utils";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

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

  const authUser = user
    ? { username: user.username, role: (user as any).role, status: (user as any).status ?? "ACTIVE", teacherId: (user as any).teacherId ?? null }
    : null;
  const initialTheme = (user as any)?.theme ?? "light";

  // PENDING users: minimal layout without header/nav
  if (user && (user as any).status === "PENDING") {
    return (
      <html lang="en">
        <body className={`${inter.className} antialiased`}>
          <ThemeProvider initialTheme={initialTheme}>
            <LanguageProvider>
              <AuthProvider user={authUser}>
                {children}
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
          <Toaster position="top-right" />
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider initialTheme={initialTheme}>
          <LanguageProvider>
            <AuthProvider user={authUser}>
              <TooltipProvider>
                <div className="min-h-screen flex flex-col">
                  <Header user={user} />
                  <main className="flex-1 container mx-auto py-4 md:py-8 px-3 md:px-4">
                    {children}
                  </main>
                  <footer className="border-t p-4 text-center text-gray-500 text-sm">
                    2026 Oxford School Schedule Manager
                  </footer>
                </div>
              </TooltipProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}


