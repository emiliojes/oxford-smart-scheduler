# Teacher Schedule Package for Devin / Windsurf

This project contains the teacher schedule Excel file and the instructions needed for Devin Desktop / Windsurf to analyze it safely.

## Files

- `data/2026_TEACHER_SCHEDULES.xlsx`: Original teacher schedule workbook. Do not overwrite it.
- `DEVIN_PROMPT.md`: Prompt to paste into Devin / Windsurf.
- `AGENTS.md`: Always-on workspace instructions.
- `.windsurf/rules/schedule_excel_rules.md`: Workspace rule for schedule-related work.
- `scripts/extract_excel_preview.py`: Optional helper script to convert the workbook into CSV/JSON previews for easier AI/code analysis.

## Recommended workflow

1. Open this folder in Devin Desktop / Windsurf.
2. Paste the content of `DEVIN_PROMPT.md` into the chat/agent.
3. Ask the agent to inspect the workbook first and summarize what it understands before editing code.
4. Do not let the agent modify the Excel directly unless you make a copy first.

