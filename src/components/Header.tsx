"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UserNav } from "@/components/UserNav";
import { isAdmin, isCoordinator } from "@/lib/roles";
import { Menu, X } from "lucide-react";

interface HeaderProps {
  user: {
    username: string;
    role: string;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const canManage = isCoordinator(user);
  const canSeeAdmin = isAdmin(user);
  const isTeacher = user?.role === "TEACHER";
  const isCoordinatorOnly = user?.role === "COORDINATOR";

  const linkClass = (href: string, extra = "") =>
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
      pathname === href ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
    } ${extra}`;

  const navLinks = (
    <>
      {canManage && (
        <>
          <Link href="/teachers" className={linkClass("/teachers")} onClick={() => setMenuOpen(false)}>{t.nav.teachers}</Link>
          <Link href="/subjects" className={linkClass("/subjects")} onClick={() => setMenuOpen(false)}>{t.nav.subjects}</Link>
          <Link href="/grades" className={linkClass("/grades")} onClick={() => setMenuOpen(false)}>{t.nav.grades}</Link>
          <Link href="/rooms" className={linkClass("/rooms")} onClick={() => setMenuOpen(false)}>{t.nav.rooms}</Link>
          {canSeeAdmin && (
            <Link href="/settings/time-blocks" className={linkClass("/settings/time-blocks")} onClick={() => setMenuOpen(false)}>{t.nav.timeBlocks}</Link>
          )}
          <Link href="/bell" className={linkClass("/bell")} onClick={() => setMenuOpen(false)}>{t.nav.bell}</Link>
        </>
      )}
      {canSeeAdmin && (
        <Link href="/users" className={linkClass("/users", "text-yellow-300 hover:text-yellow-200")} onClick={() => setMenuOpen(false)}>Users</Link>
      )}
      {isCoordinatorOnly && (
        <Link href="/approvals" className={linkClass("/approvals", "text-amber-300 hover:text-amber-200")} onClick={() => setMenuOpen(false)}>Aprobaciones</Link>
      )}
      <Link href="/schedule" className={`${linkClass("/schedule")} !bg-blue-600 hover:!bg-blue-700 !text-white`} onClick={() => setMenuOpen(false)}>{t.nav.schedule}</Link>
    </>
  );

  return (
    <header className="border-b bg-slate-900 text-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link href={isTeacher ? "/schedule" : "/"} className="text-lg font-bold shrink-0">
            Oxford Schedule
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {navLinks}
          </nav>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            <UserNav user={user} />
            <LanguageSwitcher />
          </div>

          {/* Mobile: right side + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />
            <UserNav user={user} />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md hover:bg-slate-700 transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-700 bg-slate-900 px-4 py-3 flex flex-col gap-1">
          {navLinks}
        </div>
      )}
    </header>
  );
}
