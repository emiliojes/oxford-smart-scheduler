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

## Time Block Overlap Rules

Time blocks can overlap between different levels without causing conflicts:

* PRIMARY blocks can overlap with SECONDARY blocks (different student groups)
* LOW_SECONDARY blocks can overlap with SECONDARY blocks (different student groups)
* **This is normal and expected** - students from different levels have different schedules

### Conflict Detection

**Real conflicts occur when:**

* A teacher has multiple assignments in overlapping time blocks on the same day
* A room is double-booked in overlapping time blocks on the same day
* A grade has multiple assignments in overlapping time blocks on the same day

**Not a conflict:**

* Different levels using overlapping time blocks (e.g., Middle School 14:00-15:15 and High School 14:15-15:15)
* This allows different school divisions to have different schedules

### Teacher Conflict Example

If a teacher teaches BOTH Middle and High School:
* Assignment 1: Grade 8A (LOW_SECONDARY) at 14:00-15:15
* Assignment 2: Grade 12A (SECONDARY) at 14:15-15:15
* ⚠️ **CONFLICT** - Teacher cannot be in two places at once

Always check for teacher conflicts when creating assignments, not just time block overlaps.

## Response Style

When helping with this project:

* Explain changes in simple steps.
* Warn me if a change could break the timetable logic.
* Before creating new tables, ask whether the existing Assignment model can solve it.
* Prefer practical code that fits this existing structure.
* Remember: Time block overlaps between levels are OK, but teacher/room/grade conflicts are NOT.
