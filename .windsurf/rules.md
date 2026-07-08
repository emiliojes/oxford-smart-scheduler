# Windsurf Rules – School Timetable App

## Project Context

This is a school timetable management app.

Tech stack:

* Next.js 14 with App Router
* React
* TailwindCSS
* shadcn/ui
* PostgreSQL
* Prisma ORM
* Custom authentication system with roles

## Core Data Model

The main entities are:

* Teachers: teachers who can have assignments
* Grades: student groups such as 9A, 9B, 10A
* Subjects: subjects such as Biology, Chemistry, Math
* TimeBlocks: schedule slots with day, start time, end time, and type
* Assignments: the central timetable entity

## Critical Business Rule

An Assignment represents both:

1. the class shown in the grade/student timetable
2. the class shown in the teacher timetable

Do not create separate tables for teacher schedules and grade schedules unless explicitly requested.

The same Assignment row must be used when displaying:

* a grade timetable
* a teacher timetable
* a room timetable
* subject scheduling

## Assignment Meaning

Each assignment connects:

teacher + grade + subject + timeBlock + room

This means:

* If we filter by grade, we see the student group timetable.
* If we filter by teacher, we see the teacher timetable.
* If we filter by room, we see room usage.
* These must all come from the same assignments table.

## School Levels

Use these levels:

* PRIMARY = primary school
* LOW_SECONDARY = grades 6–8 / middle school
* SECONDARY = grades 9–12 / high school

Do not rename LOW_SECONDARY to MIDDLE unless I explicitly ask.

## Coding Rules

* Use TypeScript.
* Use Prisma for database access.
* Do not write raw SQL unless necessary.
* Use Server Components by default in Next.js App Router.
* Use Client Components only when state, events, or browser APIs are needed.
* Keep UI consistent with TailwindCSS and shadcn/ui.
* Keep components small and readable.
* Prefer clear names over short names.

## Prisma Rules

* Before changing the schema, explain what model or relation will change.
* Do not duplicate timetable data.
* Do not add teacherSchedule or gradeSchedule tables.
* Assignment is the source of truth for schedules.
* Respect existing relations between Teacher, Grade, Subject, TimeBlock, Room, and Assignment.

## UI Rules

When building timetable views:

* Grade timetable: filter assignments by gradeId.
* Teacher timetable: filter assignments by teacherId.
* Room timetable: filter assignments by roomId.
* Display day, start time, end time, subject, teacher, grade, and room when relevant.

## Auth and Roles

The app uses a custom auth system with roles.

Before adding protected features:

* Check the current role system.
* Do not replace it with NextAuth or another auth library unless explicitly requested.
* Keep role checks simple and centralized.

## Response Style

When helping with this project:

* Explain changes in simple steps.
* Warn me if a change could break the timetable logic.
* Before creating new tables, ask whether the existing Assignment model can solve it.
* Prefer practical code that fits this existing structure.

## Lunch Blocks by School Level

The student timetable remains the source of truth.

Do not modify student schedules automatically to fit teacher lunch blocks. Teacher schedules must be derived from existing assignments.

Current active lunch blocks:

* MIDDLE SCHOOL (LOW_SECONDARY): Lunch from 11:30 AM to 12:00 PM
* HIGH SCHOOL (SECONDARY): Lunch from 12:40 PM to 1:15 PM
* PRIMARY: Lunch from 12:00 PM to 12:30 PM — future reference only, do not enforce yet

## Teacher Lunch Block Logic

When displaying a teacher schedule, derive the teacher's school levels from their assignments.

Rules:

* If a teacher only teaches Middle School, show the Middle lunch block.
* If a teacher only teaches High School, show the High lunch block.
* If a teacher teaches both Middle and High School, show both lunch blocks.
* If Primary appears in the data, keep it as future reference only and do not enforce it.

Lunch blocks are generated display blocks, not stored assignments.

If a class overlaps a lunch block, do not automatically move the class. Show a conflict or warning for admin review.

## Secondary Supervision Duties

### Concept

Supervision duties are teacher-only duties assigned during Lunch or Morning Break.

They must appear in the teacher schedule view.
They must NOT appear in student/grade schedules.
They are NOT classes, subjects, or assignments.
They must not overwrite or replace existing teacher classes.
They are additional blocks shown only on the teacher's personal schedule.

### Data Model

A supervision duty has:

* teacher (relation to Teacher)
* day pattern (see options below)
* startTime
* endTime
* area / location (string, e.g. "Playground Area / Ping Pong Tables")
* level: Secondary
* isClosed: boolean (if true, no teacher required, displayed as closed)

Day pattern options:

* EVERYDAY
* MON_TO_FRI
* MON_TO_THU
* TUE_AND_THU
* MON, TUE, WED, THU, FRI (single days)

Do not store supervision duties in the Assignment table.
Create a separate model (e.g. SupervisionDuty) for them.

### Conflict Rules

Supervision happens during lunch or morning break, so it should NOT automatically create a conflict.

Do NOT flag a conflict when:
* Supervision overlaps with Lunch block.
* Supervision overlaps with Morning Break block.
* Two or more teachers supervise the same area at the same time (multiple teachers in Cafeteria, Playground, Gym, etc. is expected and allowed).

DO flag a conflict when:
* The same teacher is assigned to two different supervision areas at the same time.
* The same teacher has two overlapping supervision duties on the same day.
* The same teacher has a real class scheduled during their supervision time by mistake.

Conflict logic is based on the individual teacher's personal availability, not on how many teachers share an area.

### Closed Area Rule

An area can be marked as closed.

If closed:
* No teacher assignment is required.
* It still appears in the supervision schedule.
* It is displayed as "Closed" (visually distinct).
* It does NOT create a missing-teacher error or conflict.

### Teacher Schedule Display

Supervision duties appear in the teacher schedule as a labeled block, visually distinct from regular classes.

Display format examples:

```
Lunch
12:40 p.m. – 1:15 p.m.
Duty: Playground Area / Ping Pong Tables
12:45 p.m. – 1:15 p.m.
```

```
9:30 a.m. – 9:45 a.m.
Morning Break Duty: Washrooms / Downstairs
```

### Known Supervision Schedule (Secondary 2026)

#### Secondary Lunch Supervision

**Playground Area / Ping Pong Tables** — 12:45 p.m. – 1:15 p.m.
* Catur Salomon — EVERYDAY
* Andrea Concepción — WED

**Football Court** — 1:00 p.m. – 1:15 p.m.
* Ricardo Ferran — MON
* Conrado de León — TUE
* Emilio Núñez — WED
* Christian Ho Sang — THU

**Gym** — 12:45 p.m. – 1:15 p.m.
* Manuel Abrego — MON
* Aristides Guerra — TUE
* Vanessa Muñoz — WED
* Ricardo Ferran — THU

**Cafeteria** — 12:45 p.m. – 1:15 p.m.
* Vielka Vega — MON
* Irlanda Tuñón — MON
* María Pitti — TUE
* Elida Barria — WED
* Enis Rodriguez — THU

**School Bus Area** — 12:45 p.m. – 1:15 p.m.
* Adolfo Díaz — MON
* Kennar Callender — TUE
* Karina Peñalba — WED
* Judith Gil — THU

**Washrooms / Downstairs** — 12:45 p.m. – 1:15 p.m.
* Arlex Alvarado — TUE and THU
* Deisy Vega — MON to THU

#### Secondary Morning Break Supervision — 9:30 a.m. – 9:45 a.m.

**Playground Area / Ping Pong Tables**
* Karina Peñalba — MON to FRI

**Playground Area**
* Arlex Alvarado — MON to THU

**Washrooms / Downstairs**
* Christian Ho Sang — MON to FRI

**Gym**
* Closed — MON to FRI
