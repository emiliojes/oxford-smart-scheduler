"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendingPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.status === "ACTIVE") {
      router.replace("/");
    }
  }, [user, router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">Cuenta pendiente de aprobación</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Tu cuenta ha sido registrada exitosamente. Un administrador o coordinador 
            necesita aprobarla y asignarte un rol antes de que puedas acceder al sistema.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left space-y-2">
          <p className="text-amber-800 text-sm font-semibold">¿Qué sucede ahora?</p>
          <ul className="text-amber-700 text-sm space-y-1 list-disc list-inside">
            <li>Un administrador revisará tu solicitud</li>
            <li>Se te asignará el rol correspondiente</li>
            <li>Recibirás acceso al sistema una vez aprobado</li>
          </ul>
        </div>

        {user && (
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
            Registrado como: <span className="font-semibold">{user.username}</span>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
