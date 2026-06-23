import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Función para convertir tiempo a minutos
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Función para verificar si dos bloques se solapan
function blocksOverlap(block1: any, block2: any): boolean {
  const start1 = timeToMinutes(block1.startTime);
  const end1 = timeToMinutes(block1.endTime);
  const start2 = timeToMinutes(block2.startTime);
  const end2 = timeToMinutes(block2.endTime);
  
  return start1 < end2 && start2 < end1;
}

// Función para verificar si un grade es SECONDARY o LOW_SECONDARY
function isSecondaryGrade(gradeName: string): boolean {
  const gradeNum = parseInt(gradeName);
  return !isNaN(gradeNum) && gradeNum >= 6 && gradeNum <= 12;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const levelFilter = searchParams.get('level') || 'all'; // 'all', 'secondary', 'primary'

  try {
    const teachers = await prisma.teacher.findMany({
      orderBy: { name: 'asc' }
    });

    const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const allConflicts: any[] = [];

    for (const teacher of teachers) {
      const assignments = await prisma.assignment.findMany({
        where: { teacherId: teacher.id },
        include: {
          subject: true,
          grade: true,
          timeBlock: true,
        },
        orderBy: [
          { timeBlock: { dayOfWeek: 'asc' } },
          { timeBlock: { startTime: 'asc' } }
        ]
      });

      // Filtrar según el nivel
      let filteredAssignments = assignments.filter(a => a.grade);
      
      if (levelFilter === 'secondary') {
        filteredAssignments = filteredAssignments.filter(a => isSecondaryGrade(a.grade!.name));
      } else if (levelFilter === 'primary') {
        filteredAssignments = filteredAssignments.filter(a => !isSecondaryGrade(a.grade!.name));
      }

      if (filteredAssignments.length === 0) continue;

      // Agrupar por día
      const byDay: { [key: number]: any[] } = {};
      filteredAssignments.forEach(a => {
        if (!byDay[a.timeBlock.dayOfWeek]) {
          byDay[a.timeBlock.dayOfWeek] = [];
        }
        byDay[a.timeBlock.dayOfWeek].push(a);
      });

      // Verificar conflictos en cada día
      for (const day in byDay) {
        const dayAssignments = byDay[day];
        
        for (let i = 0; i < dayAssignments.length; i++) {
          for (let j = i + 1; j < dayAssignments.length; j++) {
            const a1 = dayAssignments[i];
            const a2 = dayAssignments[j];
            
            if (blocksOverlap(a1.timeBlock, a2.timeBlock)) {
              allConflicts.push({
                teacherId: teacher.id,
                teacherName: teacher.name,
                day: parseInt(day),
                dayName: days[parseInt(day)],
                assignment1: {
                  id: a1.id,
                  grade: `${a1.grade.name}${a1.grade.section || ''}`,
                  subject: a1.subject.name,
                  startTime: a1.timeBlock.startTime,
                  endTime: a1.timeBlock.endTime,
                  timeBlockId: a1.timeBlock.id
                },
                assignment2: {
                  id: a2.id,
                  grade: `${a2.grade.name}${a2.grade.section || ''}`,
                  subject: a2.subject.name,
                  startTime: a2.timeBlock.startTime,
                  endTime: a2.timeBlock.endTime,
                  timeBlockId: a2.timeBlock.id
                }
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      conflicts: allConflicts,
      total: allConflicts.length,
      level: levelFilter
    });

  } catch (error) {
    console.error('Error fetching conflicts:', error);
    return NextResponse.json({ error: 'Failed to fetch conflicts' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
