"use client";

import { useState, useEffect } from "react";

interface Conflict {
  teacherId: string;
  teacherName: string;
  day: number;
  dayName: string;
  assignment1: {
    id: string;
    grade: string;
    subject: string;
    startTime: string;
    endTime: string;
    timeBlockId: string;
  };
  assignment2: {
    id: string;
    grade: string;
    subject: string;
    startTime: string;
    endTime: string;
    timeBlockId: string;
  };
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<'all' | 'secondary' | 'primary'>('secondary');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');

  useEffect(() => {
    fetchConflicts();
  }, [levelFilter]);

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/conflicts?level=${levelFilter}`);
      const data = await response.json();
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta asignación?')) return;

    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Asignación eliminada correctamente');
        fetchConflicts(); // Recargar conflictos
      } else {
        alert('Error al eliminar la asignación');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Error al eliminar la asignación');
    }
  };

  const uniqueTeachers = Array.from(new Set(conflicts.map(c => c.teacherName))).sort();
  
  const filteredConflicts = selectedTeacher === 'all' 
    ? conflicts 
    : conflicts.filter(c => c.teacherName === selectedTeacher);

  const conflictsByTeacher = filteredConflicts.reduce((acc, conflict) => {
    if (!acc[conflict.teacherName]) {
      acc[conflict.teacherName] = [];
    }
    acc[conflict.teacherName].push(conflict);
    return acc;
  }, {} as { [key: string]: Conflict[] });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Detección de Conflictos
          </h1>
          <p className="text-gray-600">
            Conflictos de horarios donde un teacher tiene múltiples asignaciones al mismo tiempo
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nivel
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los niveles</option>
                <option value="secondary">Middle & High School (6-12)</option>
                <option value="primary">Primary (K-5)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teacher
              </label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los teachers ({uniqueTeachers.length})</option>
                {uniqueTeachers.map(teacher => (
                  <option key={teacher} value={teacher}>{teacher}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Total Conflictos</div>
            <div className="text-3xl font-bold text-red-600">{filteredConflicts.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Teachers Afectados</div>
            <div className="text-3xl font-bold text-orange-600">
              {Object.keys(conflictsByTeacher).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">Nivel</div>
            <div className="text-lg font-semibold text-gray-900">
              {levelFilter === 'all' ? 'Todos' : levelFilter === 'secondary' ? 'Middle & High' : 'Primary'}
            </div>
          </div>
        </div>

        {/* Lista de conflictos */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Cargando conflictos...</div>
          </div>
        ) : filteredConflicts.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="text-green-600 text-xl font-semibold mb-2">
              ✅ No se encontraron conflictos
            </div>
            <div className="text-green-700">
              Todos los horarios están correctamente asignados
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(conflictsByTeacher).map(([teacherName, teacherConflicts]) => (
              <div key={teacherName} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-red-50 border-b border-red-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-red-900">
                    ⚠️ {teacherName}
                  </h2>
                  <p className="text-red-700 text-sm">
                    {teacherConflicts.length} conflicto(s) encontrado(s)
                  </p>
                </div>

                <div className="divide-y divide-gray-200">
                  {teacherConflicts.map((conflict, index) => (
                    <div key={index} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                            {conflict.dayName}
                          </span>
                          <span className="text-gray-600 text-sm">
                            Conflicto #{index + 1}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Assignment 1 */}
                        <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-orange-900">
                              {conflict.assignment1.startTime} - {conflict.assignment1.endTime}
                            </span>
                            <button
                              onClick={() => deleteAssignment(conflict.assignment1.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Eliminar
                            </button>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {conflict.assignment1.grade} {conflict.assignment1.subject}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {conflict.assignment1.id.substring(0, 8)}
                          </div>
                        </div>

                        {/* Assignment 2 */}
                        <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-orange-900">
                              {conflict.assignment2.startTime} - {conflict.assignment2.endTime}
                            </span>
                            <button
                              onClick={() => deleteAssignment(conflict.assignment2.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Eliminar
                            </button>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {conflict.assignment2.grade} {conflict.assignment2.subject}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {conflict.assignment2.id.substring(0, 8)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-red-600 font-medium">
                        ⚠️ Solapamiento: {conflict.assignment1.startTime} - {conflict.assignment2.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
