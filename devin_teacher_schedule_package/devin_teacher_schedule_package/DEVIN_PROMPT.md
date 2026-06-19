# Prompt to paste into Devin / Windsurf

I need you to analyze the Excel workbook located at:

`data/2026_TEACHER_SCHEDULES.xlsx`

Goal:
Create or adjust the schedule logic/rules for teacher lunch blocks in my scheduling project.

Context:
The Excel contains teacher schedules for 2026. It is not a clean database table; it appears to have repeated blocks with teacher names, grade/subject info, time slots, weekdays, lunches, duties, and blank rows.

Lunch blocks to consider:
- Primary: 12:00 to 12:30. Keep this in mind, but do not change Primary for now.
- Middle School: 11:30 to 12:00.
- High School: 12:40 to 1:15.

What I need:
1. Inspect the workbook structure first.
2. Identify how teachers, grades, days, time slots, classes, lunches, and duties are represented.
3. Create a parsed preview of the workbook as CSV or JSON.
4. Detect teachers who only teach Middle School.
5. Detect teachers who only teach High School.
6. Detect teachers who teach both Middle and High School.
7. For Middle-only teachers, apply/suggest the Middle lunch block.
8. For High-only teachers, apply/suggest the High lunch block.
9. For mixed Middle/High teachers, do not change automatically; create a conflict report with suggested options.
10. Do not overwrite the original Excel file. Create derived files in an `output/` folder.

Before changing code, summarize:
- What sheets exist.
- What pattern you found in the schedule.
- What assumptions you are making.
- What files you plan to create or modify.

After implementing, provide:
- A conflict report.
- A summary of teachers by category: Middle-only, High-only, Mixed, Unknown.
- Any schedule rows that could not be confidently classified.

