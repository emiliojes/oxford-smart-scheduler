---
trigger: always_on
---

# Teacher Schedule Excel Rules

When working with the teacher schedule Excel:

- Never overwrite `data/2026_TEACHER_SCHEDULES.xlsx`.
- Make a copy or generate derived outputs in an `output/` folder.
- Inspect before editing.
- The workbook may contain teacher schedules in repeated blocks, not a normalized table.
- Detect and report conflicts before proposing changes.
- For lunch rules:
  - Middle School lunch = 11:30–12:00.
  - High School lunch = 12:40–1:15.
  - Primary lunch = 12:00–12:30, but do not implement Primary changes unless explicitly requested.
- For mixed Middle/High teachers, do not guess. Generate a conflict report with options.

