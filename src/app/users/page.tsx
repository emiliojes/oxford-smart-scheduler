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
import { UserPlus, Pencil, Trash2, Shield } from "lucide-react";

interface User {
  id: string;
  username: string;
  role: string;
}

export default function UsersPage() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: "bg-red-100 text-red-800",
      COORDINATOR: "bg-blue-100 text-blue-800",
      TEACHER: "bg-green-100 text-green-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || "bg-gray-100"}`}>
        {role}
      </span>
    );
  };

  if (currentUser?.role !== "ADMIN") {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Access denied. Admin only.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-8 h-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Create and manage user accounts and roles
          </p>
        </div>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setEditingUser(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="e.g. coordinator1"
                    required
                    minLength={3}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingUser ? "New Password (leave empty to keep current)" : "Password"}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Min 6 characters"
                  required={!editingUser}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue={editingUser?.role || "TEACHER"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="COORDINATOR">Coordinator</SelectItem>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setEditingUser(null);
                  }}
                >
                  {t.actions.cancel}
                </Button>
                <Button type="submit">
                  {editingUser ? t.actions.update : t.actions.save}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">{t.actions.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  {t.actions.loading}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>{getRoleBadge(u.role)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingUser(u);
                          setIsOpen(true);
                        }}
                        title={t.actions.edit}
                      >
                        <Pencil className="h-4 w-4 text-amber-600" />
                      </Button>
                      {u.username !== currentUser?.username && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDelete(u.id)}
                          title={t.actions.delete}
                        >
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
