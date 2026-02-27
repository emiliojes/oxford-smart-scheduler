"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Users, BookOpen, GraduationCap, School, Calendar, AlertTriangle, CheckCircle, Bell } from "lucide-react";

interface Stats {
  teachers: number;
  subjects: number;
  grades: number;
  rooms: number;
  assignments: number;
  conflicts: number;
}

export default function Home() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Error fetching stats:", err));
  }, []);

  return (
    <div className="space-y-8">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-slate-900">
          {t.home.title}
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          {t.home.subtitle}
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card 
          title={t.nav.teachers} 
          description={t.home.cards.teachersDesc}
          icon={<Users className="w-8 h-8 text-blue-600" />}
          href="/teachers"
          count={stats?.teachers}
        />
        <Card 
          title={t.nav.subjects} 
          description={t.home.cards.subjectsDesc}
          icon={<BookOpen className="w-8 h-8 text-green-600" />}
          href="/subjects"
          count={stats?.subjects}
        />
        <Card 
          title={t.nav.grades} 
          description={t.home.cards.gradesDesc}
          icon={<GraduationCap className="w-8 h-8 text-purple-600" />}
          href="/grades"
          count={stats?.grades}
        />
        <Card 
          title={t.nav.rooms} 
          description={t.home.cards.roomsDesc}
          icon={<School className="w-8 h-8 text-orange-600" />}
          href="/rooms"
          count={stats?.rooms}
        />
        <Card 
          title={t.nav.schedule} 
          description={t.home.cards.generatorDesc}
          icon={<Calendar className="w-8 h-8 text-red-600" />}
          href="/schedule/generate"
          highlight
          count={stats?.assignments}
          countLabel={t.home.stats.classes}
        />
        <Card 
          title={t.nav.bell} 
          description={t.home.cards.bellDesc}
          icon={<Bell className="w-8 h-8 text-amber-600" />}
          href="/bell"
        />
      </div>

      {stats && stats.conflicts > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-500 w-6 h-6" />
            <div>
              <p className="text-red-800 font-bold">{t.home.stats.conflicts.replace('{count}', stats.conflicts.toString())}</p>
              <Link href="/schedule" className="text-red-600 text-sm font-medium hover:underline">{t.home.stats.reviewNow}</Link>
            </div>
          </div>
        </div>
      )}

      <section className="bg-slate-50 p-8 rounded-xl border border-slate-200">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-slate-900">
          <AlertTriangle className="text-amber-500" />
          {t.home.priorities}
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2" />
            <span>{t.home.priority1}</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2" />
            <span>{t.home.priority2}</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2" />
            <span>{t.home.priority3}</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2" />
            <span>{t.home.priority4}</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

function Card({ title, description, icon, href, highlight = false, count, countLabel }: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  href: string;
  highlight?: boolean;
  count?: number;
  countLabel?: string;
}) {
  return (
    <Link 
      href={href}
      className={`p-6 rounded-xl border transition-all hover:shadow-lg flex flex-col gap-4 relative group ${
        highlight 
          ? "border-blue-200 bg-blue-50 hover:bg-blue-100" 
          : "border-slate-200 bg-white hover:border-blue-300"
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="p-3 bg-white rounded-lg shadow-sm w-fit group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {count !== undefined && (
          <div className="text-right">
            <span className="text-2xl font-black text-slate-900 leading-none">{count}</span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{countLabel || title}</p>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="text-slate-600 mt-1 text-sm">{description}</p>
      </div>
    </Link>
  );
}
