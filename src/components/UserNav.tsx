"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth-actions";
import { LogOut, User } from "lucide-react";
import Link from "next/link";

interface UserNavProps {
  user: {
    username: string;
    role: string;
  } | null;
}

export function UserNav({ user }: UserNavProps) {
  const { t } = useLanguage();

  if (!user) {
    return (
      <Button asChild variant="outline" className="text-slate-900 border-white hover:bg-slate-100">
        <Link href="/login">{t.auth.login}</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="hidden md:flex flex-col items-end gap-0 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <User className="w-3 h-3" />
          <span className="font-medium text-white">{user.username}</span>
        </div>
        <span className="text-[10px] opacity-70 uppercase tracking-wider">{user.role}</span>
      </div>
      <form action={async () => {
        await logout();
      }}>
        <Button 
          type="submit" 
          variant="ghost" 
          size="sm" 
          className="text-white hover:text-red-400 hover:bg-white/10 gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">{t.auth.signOut}</span>
        </Button>
      </form>
    </div>
  );
}
