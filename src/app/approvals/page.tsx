"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, Clock, Trash2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  role: string;
  status: string;
  teacherId?: string | null;
  createdAt?: string;
}

interface Teacher {
  id: string;
  name: string;
  level: string;
}

const COORDINATOR_ASSIGNABLE = ["COORDINATOR", "TEACHER"];

export default function ApprovalsPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approveState, setApproveState] = useState<{ user: User; role: string; teacherId: string } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== "COORDINATOR" && currentUser.role !== "ADMIN") {
      router.replace("/");
      return;
    }
    fetchPendingUsers();
    fetchTeachers();
  }, [currentUser]);

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.filter((u: User) => u.status === "PENDING"));
      }
    } catch {
      toast.error("Error al cargar usuarios");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/teachers");
      if (res.ok) setTeachers(await res.json());
    } catch {}
  };

  const approveUser = async (u: User, role: string, teacherId?: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, role, status: "ACTIVE", teacherId: teacherId || null }),
      });
      if (res.ok) {
        toast.success(`${u.username} aprobado como ${role}`);
        setApproveState(null);
        fetchPendingUsers();
      } else {
        const result = await res.json();
        toast.error(result.error || "Error al aprobar");
      }
    } catch {
      toast.error("Connection error");
    }
  };

  const rejectUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Usuario eliminado");
        fetchPendingUsers();
      }
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const pendingUsers = users.filter(u => u.status === "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Solicitudes de Aprobación</h1>
        <p className="text-muted-foreground">Aprueba nuevos usuarios y asígnales un rol.</p>
      </div>

      {/* Approve Dialog */}
      <Dialog open={!!approveState} onOpenChange={(o) => { if (!o) setApproveState(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar usuario: {approveState?.user.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rol a asignar</Label>
              <Select value={approveState?.role || "TEACHER"} onValueChange={(v) => setApproveState(s => s ? { ...s, role: v } : null)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COORDINATOR_ASSIGNABLE.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vincular a profesor <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Select
                value={approveState?.teacherId || "none"}
                onValueChange={(v) => setApproveState(s => s ? { ...s, teacherId: v === "none" ? "" : v } : null)}
              >
                <SelectTrigger><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin vincular —</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.level})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {approveState?.teacherId && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded p-2">
                Este usuario solo verá el horario de <strong>{teachers.find(t => t.id === approveState.teacherId)?.name}</strong>.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setApproveState(null)}>Cancelar</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 gap-1"
                onClick={() => approveState && approveUser(approveState.user, approveState.role, approveState.teacherId)}
              >
                <CheckCircle className="w-4 h-4" /> Aprobar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : pendingUsers.length === 0 ? (
        <div className="border rounded-lg bg-white shadow-sm p-12 text-center text-muted-foreground">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
          <p className="font-medium">No hay solicitudes pendientes</p>
        </div>
      ) : (
        <div className="border-l-4 border-amber-400 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-amber-50">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-amber-800">Esperando Aprobación</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">{pendingUsers.length}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-50/50">
                <TableHead>Usuario</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        className="gap-1 bg-green-600 hover:bg-green-700 text-white h-8"
                        onClick={() => setApproveState({ user: u, role: "TEACHER", teacherId: "" })}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => rejectUser(u.id)} title="Rechazar / Eliminar">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
