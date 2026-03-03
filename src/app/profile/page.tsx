"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Lock, Sun, Moon, Globe, Save } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  name: string | null;
  role: string;
  status: string;
  theme: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN:       { label: "Administrador", color: "bg-red-100 text-red-800" },
  COORDINATOR: { label: "Coordinador",   color: "bg-blue-100 text-blue-800" },
  TEACHER:     { label: "Docente",       color: "bg-green-100 text-green-800" },
  PENDING:     { label: "Pendiente",     color: "bg-gray-100 text-gray-800" },
};

export default function ProfilePage() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setName(data.name ?? "");
        setUsername(data.username ?? "");
        if (data.theme && (data.theme === "dark" || data.theme === "light")) {
          setTheme(data.theme);
        }
      });
  }, []);

  const handleSaveInfo = async () => {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, theme }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error); return; }
    setProfile(data);
    toast.success("Perfil actualizado");
  };

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("Las contraseñas no coinciden"); return; }
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error); return; }
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    toast.success("Contraseña actualizada");
  };

  const handleThemeChange = async (t: "light" | "dark") => {
    setTheme(t);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: t }),
    });
  };

  const handleLanguageChange = (lang: "en" | "es") => {
    setLanguage(lang);
  };

  if (!profile) return <div className="flex items-center justify-center h-40 text-slate-500">Cargando...</div>;

  const roleInfo = ROLE_LABELS[profile.role] ?? { label: profile.role, color: "bg-gray-100 text-gray-800" };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <User className="w-6 h-6 text-slate-500 dark:text-slate-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {profile.name || profile.username}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">@{profile.username}</span>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Información personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre completo" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Usuario</Label>
            <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
          </div>
          <Button onClick={handleSaveInfo} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> Guardar cambios
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" /> Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPwd">Contraseña actual</Label>
            <Input id="currentPwd" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPwd">Nueva contraseña</Label>
            <Input id="newPwd" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPwd">Confirmar contraseña</Label>
            <Input id="confirmPwd" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button onClick={handleSavePassword} disabled={saving} variant="outline" className="gap-2">
            <Lock className="w-4 h-4" /> Actualizar contraseña
          </Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="w-4 h-4" /> Preferencias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Theme */}
          <div>
            <Label className="mb-2 block">Tema</Label>
            <div className="flex gap-3">
              <button
                onClick={() => handleThemeChange("light")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  theme === "light"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Sun className="w-4 h-4" /> Claro
              </button>
              <button
                onClick={() => handleThemeChange("dark")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  theme === "dark"
                    ? "border-blue-500 bg-blue-900/20 text-blue-400"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Moon className="w-4 h-4" /> Oscuro
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <Label className="mb-2 block flex items-center gap-2">
              <Globe className="w-4 h-4" /> Idioma
            </Label>
            <div className="flex gap-3">
              <button
                onClick={() => handleLanguageChange("es")}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  language === "es"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                🇵🇦 Español
              </button>
              <button
                onClick={() => handleLanguageChange("en")}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  language === "en"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                🇺🇸 English
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
