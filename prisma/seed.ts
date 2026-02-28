import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding data...')

  // 1. Aulas
  const room1 = await prisma.room.upsert({
    where: { name: 'Salon 13' },
    update: {},
    create: {
      name: 'Salon 13',
      capacity: 35,
      isSpecialized: false,
    },
  })

  const room2 = await prisma.room.upsert({
    where: { name: 'Computing Lab' },
    update: {},
    create: {
      name: 'Computing Lab',
      capacity: 30,
      isSpecialized: true,
      specializedFor: 'Computing',
      maxStudents: 30,
    },
  })

  // 2. Materias
  const math = await prisma.subject.create({
    data: {
      name: 'Mathematics',
      level: 'SECONDARY',
      weeklyFrequency: 5,
      defaultDuration: 'SIXTY',
    },
  })

  const computing = await prisma.subject.create({
    data: {
      name: 'Computing',
      level: 'BOTH',
      weeklyFrequency: 3,
      defaultDuration: 'SIXTY',
      requiresSpecialRoom: true,
      specialRoomType: 'Computing',
    },
  })

  // 3. Profesores
  const teacher1 = await prisma.teacher.create({
    data: {
      name: 'Emilio Nuñez',
      level: 'SECONDARY',
      maxWeeklyHours: 27,
      subjects: {
        create: [
          { subject: { connect: { id: computing.id } } },
          { subject: { connect: { id: math.id } } },
        ],
      },
    },
  })

  // 4. Grados
  const grade9a = await prisma.grade.create({
    data: {
      name: '9',
      section: 'A',
      level: 'SECONDARY',
      studentCount: 28,
      subjectCount: 12,
      subjects: {
        create: [
          { subject: { connect: { id: math.id } } },
          { subject: { connect: { id: computing.id } } },
        ],
      },
    },
  })

  // 5. Bloques Horarios
  const blocks = []
  const times = ['07:30', '08:30', '09:45', '10:45', '11:45', '13:15', '14:15']
  
  for (let day = 1; day <= 5; day++) {
    for (const time of times) {
      blocks.push(
        prisma.timeBlock.create({
          data: {
            dayOfWeek: day,
            startTime: time,
            endTime: time,
            duration: 'SIXTY',
            level: 'SECONDARY',
            blockType: 'CLASS',
          },
        })
      )
    }
  }
  await Promise.all(blocks)

  // 6. Configuración de Timbre
  await prisma.bellConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      enabled: true,
      status: 'DISCONNECTED',
    },
  })

  console.log('Seeding completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
