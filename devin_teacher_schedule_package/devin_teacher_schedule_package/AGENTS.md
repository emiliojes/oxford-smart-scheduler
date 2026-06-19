# Project Instructions for Devin / Windsurf

You are helping build or adjust a teacher scheduling workflow using the Excel file in `data/2026_TEACHER_SCHEDULES.xlsx`.

Important rules:
- Preserve the original Excel file. Never overwrite it directly.
- First inspect the workbook structure and explain what you found.
- Treat the workbook as semi-structured: teacher names, grades, times, days, and duties may appear in blocks instead of a clean database table.
- When creating code, make it robust for merged cells, blank rows, repeated headers, and irregular spacing.
- Use clear variable names such as `teacher_name`, `grade_level`, `day`, `time_slot`, `subject_or_duty`, and `school_section`.
- Before implementing schedule rules, create a small parsed sample and validate it manually.
- Keep outputs reviewable: generate CSV/JSON reports before changing the main application.

School lunch rule context:
- Primary lunch: 12:00 to 12:30. For now, keep it in mind but do not implement changes for Primary unless requested.
- Middle School lunch: 11:30 to 12:00.
- High School lunch: 12:40 to 1:15.
- Teachers who only teach Middle School should reflect the Middle School block.
- Teachers who only teach High School should reflect the High School block.
- Teachers who teach both Middle and High School need conflict detection and a suggested resolution, not an automatic forced change.

