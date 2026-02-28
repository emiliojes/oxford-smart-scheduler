"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { UserPlus, Pencil, Trash2, Shield, CheckCircle, Clock } from "lucide-react";

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

const ROLE_LEVEL: Record<string, number> = { ADMIN: 3, COORDINATOR: 2, TEACHER: 1, PENDING: 0 };

export default function UsersPage() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [approveState, setApproveState] = useState<{ user: User; role: string; teacherId: string } | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/teachers");
      if (res.ok) setTeachers(await res.json());
    } catch {}
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error("Error fetching users");
      }
    } catch (error) {
      toast.error("Connection error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      username: formData.get("username"),
      role: formData.get("role"),
    };
    const password = formData.get("password") as string;

    if (editingUser) {
      data.id = editingUser.id;
      if (password && password.length > 0) {
        data.password = password;
      }
    } else {
      data.password = password;
    }

    try {
      const response = await fetch("/api/users", {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(editingUser ? "User updated" : "User created");
        setIsOpen(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        const result = await response.json();
        toast.error(result.error || "Error saving user");
      }
    } catch (error) {
      toast.error("Connection error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("User deleted");
        fetchUsers();
      } else {
        const result = await response.json();
        toast.error(result.error || "Error deleting user");
      }
    } catch (error) {
      toast.error("Connection error");
    }
  };

  const getRoleBadge = (role: string, status: string) => {
    if (status === "PENDING") {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" />Pendiente</span>;
    }
    const colors: Record<string, string> = {
      ADMIN: "bg-red-100 text-red-800",
      COORDINATOR: "bg-blue-100 text-blue-800",
      TEACHER: "bg-green-100 text-green-800",
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || "bg-gray-100"}`}>{role}</span>;
  };

  // Roles the current user can assign (only equal or lower)
  const assignableRoles = ["ADMIN", "COORDINATOR", "TEACHER"].filter(
    (r) => (ROLE_LEVEL[r] ?? 0) <= (ROLE_LEVEL[currentUser?.role ?? ""] ?? 0)
  );

  const approveUser = async (u: User, role: string, teacherId?: string) => {
    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, role, status: "ACTIVE", teacherId: teacherId || null }),
      });
      if (response.ok) {
        toast.success(`${u.username} aprobado como ${role}`);
        setApproveState(null);
        fetchUsers();
      } else {
        const result = await response.json();
        toast.error(result.error || "Error al aprobar");
      }
    } catch {
      toast.error("Connection error");
    }
  };

  if (currentUser?.role !== "ADMIN" && currentUser?.role !== "COORDINATOR") {
    return <div className="text-center py-20 text-muted-foreground">Acceso denegado.</div>;
  }

  const pendingUsers = users.filter((u) => u.status === "PENDING");
  const activeUsers = users.filter((u) => u.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground">Administra cuentas y roles del sistema</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditingUser(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="w-4 h-4" />Nuevo Usuario</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario</Label>
                  <Input id="username" name="username" placeholder="ej. coordinador1" required minLength={3} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">{editingUser ? "Nueva Contraseña (dejar vacío para mantener)" : "Contraseña"}</Label>
                <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" required={!editingUser} minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select name="role" defaultValue={editingUser?.role || "TEACHER"}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); setEditingUser(null); }}>{t.actions.cancel}</Button>
                <Button type="submit">{editingUser ? t.actions.update : t.actions.save}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── APPROVE DIALOG ──────────────────────────────────────── */}
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
                  {assignableRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vincular a profesor <span className="text-muted-foreground text-xs">(opcional — permite ver solo su horario)</span></Label>
              <Select
                value={approveState?.teacherId || "none"}
                onValueChange={(v) => setApproveState(s => s ? { ...s, teacherId: v === "none" ? "" : v } : null)}
              >
                <SelectTrigger><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin vincular —</SelectItem>
                  {teachers.map((t) => (
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

      {/* ── PENDING USERS ───────────────────────────────────────── */}
      {pendingUsers.length > 0 && (
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
              {pendingUsers.map((u) => (
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
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(u.id)} title="Rechazar / Eliminar">
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

      {/* ── ACTIVE USERS ────────────────────────────────────────── */}
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-slate-50">
          <Shield className="w-5 h-5 text-slate-500" />
          <h2 className="font-semibold text-slate-700">Usuarios Activos</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{activeUsers.length}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">{t.actions.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{t.actions.loading}</TableCell></TableRow>
            ) : activeUsers.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No hay usuarios activos</TableCell></TableRow>
            ) : (
              activeUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>{getRoleBadge(u.role, u.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => { setEditingUser(u); setIsOpen(true); }} title={t.actions.edit}>
                        <Pencil className="h-4 w-4 text-amber-600" />
                      </Button>
                      {u.username !== currentUser?.username && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                          onClick={() => handleDelete(u.id)} title={t.actions.delete}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
