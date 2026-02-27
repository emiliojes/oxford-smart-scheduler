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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { Plus, School, Pencil, Trash2 } from "lucide-react";

interface Room {
  id: string;
  name: string;
  capacity: number;
  isSpecialized: boolean;
  specializedFor: string | null;
  maxStudents: number | null;
}

export default function RoomsPage() {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isSpecialized, setIsSpecialized] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      toast.error("Error al cargar las aulas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      capacity: formData.get("capacity"),
      isSpecialized: isSpecialized,
      specializedFor: formData.get("specializedFor") || null,
      maxStudents: formData.get("maxStudents") || null,
    };

    try {
      const response = await fetch("/api/rooms", {
        method: editingRoom ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRoom ? { ...data, id: editingRoom.id } : data),
      });

      if (response.ok) {
        toast.success(editingRoom ? "Aula actualizada" : "Aula creada correctamente");
        setIsOpen(false);
        setEditingRoom(null);
        fetchRooms();
      } else {
        toast.error(editingRoom ? "Error al actualizar" : "Error al crear el aula");
      }
    } catch (error) {
      toast.error("Error en la petición");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta aula?")) return;
    try {
      const response = await fetch(`/api/rooms?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Aula eliminada");
        fetchRooms();
      } else {
        toast.error("Error al eliminar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.rooms.title}</h1>
          <p className="text-muted-foreground">
            {t.rooms.subtitle}
          </p>
        </div>
        <Dialog 
          open={isOpen} 
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingRoom(null);
              setIsSpecialized(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <School className="w-4 h-4" />
              {t.rooms.newRoom}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRoom ? t.rooms.editRoom : t.rooms.newRoom}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.rooms.name}</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Ej: Salon 13, Lab 1, Computing" 
                  required 
                  defaultValue={editingRoom?.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">{t.rooms.capacity}</Label>
                <Input 
                  id="capacity" 
                  name="capacity" 
                  type="number" 
                  defaultValue={editingRoom?.capacity || "30"} 
                  min="1" 
                  max="100" 
                />
              </div>
              <div className="flex items-center space-x-2 py-2">
                <Switch 
                  id="isSpecialized" 
                  checked={isSpecialized} 
                  onCheckedChange={setIsSpecialized} 
                />
                <Label htmlFor="isSpecialized">{t.rooms.specialized}</Label>
              </div>
              {isSpecialized && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specializedFor">{t.rooms.specialty}</Label>
                    <Input 
                      id="specializedFor" 
                      name="specializedFor" 
                      placeholder="Ej: Computing" 
                      required={isSpecialized} 
                      defaultValue={editingRoom?.specializedFor || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxStudents">{t.rooms.limit}</Label>
                    <Input 
                      id="maxStudents" 
                      name="maxStudents" 
                      type="number" 
                      placeholder="Ej: 30" 
                      defaultValue={editingRoom?.maxStudents || ""}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsOpen(false);
                    setEditingRoom(null);
                  }}
                >
                  {t.actions.cancel}
                </Button>
                <Button type="submit">
                  {editingRoom ? t.actions.update : t.actions.save}
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
              <TableHead>{t.rooms.name}</TableHead>
              <TableHead>{t.rooms.capacity}</TableHead>
              <TableHead>{t.rooms.specialty}</TableHead>
              <TableHead>{t.rooms.limit}</TableHead>
              <TableHead className="text-right">{t.actions.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t.actions.loading}
                </TableCell>
              </TableRow>
            ) : rooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t.actions.noData}
                </TableCell>
              </TableRow>
            ) : (
              rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.name}</TableCell>
                  <TableCell>{room.capacity}</TableCell>
                  <TableCell>{room.isSpecialized ? (room.specializedFor || t.rooms.typeSpecial) : t.rooms.typeRegular}</TableCell>
                  <TableCell>{room.maxStudents || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingRoom(room);
                          setIsSpecialized(room.isSpecialized);
                          setIsOpen(true);
                        }}
                        title={t.actions.edit}
                      >
                        <Pencil className="h-4 w-4 text-amber-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleDelete(room.id)}
                        title={t.actions.delete}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
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
