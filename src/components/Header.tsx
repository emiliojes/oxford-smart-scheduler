"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UserNav } from "@/components/UserNav";
import { isAdmin, isCoordinator } from "@/lib/roles";

interface HeaderProps {
  user: {
    username: string;
    role: string;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const { t } = useLanguage();
  
  const canManage = isCoordinator(user);
  const canSeeAdmin = isAdmin(user);

  return (
    <header className="border-b bg-slate-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">Oxford Schedule</Link>
          <nav className="flex gap-6 overflow-x-auto pb-2 md:pb-0">
            {canManage && (
              <>
                <Link href="/teachers" className="hover:text-blue-400 transition-colors whitespace-nowrap">{t.nav.teachers}</Link>
                <Link href="/subjects" className="hover:text-blue-400 transition-colors whitespace-nowrap">{t.nav.subjects}</Link>
                <Link href="/grades" className="hover:text-blue-400 transition-colors whitespace-nowrap">{t.nav.grades}</Link>
                <Link href="/rooms" className="hover:text-blue-400 transition-colors whitespace-nowrap">{t.nav.rooms}</Link>
                <Link href="/settings/time-blocks" className="hover:text-blue-400 transition-colors whitespace-nowrap">{t.nav.timeBlocks}</Link>
                <Link href="/bell" className="hover:text-blue-400 transition-colors whitespace-nowrap">{t.nav.bell}</Link>
              </>
            )}
            <Link href="/schedule" className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-700 transition-colors whitespace-nowrap">{t.nav.schedule}</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <UserNav user={user} />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
