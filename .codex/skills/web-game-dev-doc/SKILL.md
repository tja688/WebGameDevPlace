---
name: web-game-dev-doc
description: Maintain project documentation during development in Web Game Dev Place. Use on every concrete development task for an existing project. Create a new dated dev-plan note for the task, then update the unique module fact docs inside reference document when implementation changes.
---

# Web Game Dev Doc

Read `README.md` and `AGENTS.md` before editing docs.

## Workflow

1. Identify the target project folder under `WebGameDev Docs/`.
2. Create a new task note inside `dev plan/`.
3. Name the file: `YYYY-MM-DD - <development-goal>.md`
4. Do not rewrite old task notes. Add a new one for each new task.
5. After implementation, update the relevant module fact docs inside `reference document/`.
6. Append a final `Updated: YYYY-MM-DD` line to every reference doc changed for the task.

## Reference Document Rules

- Each module fact doc is unique.
- Do not create duplicate documents for the same module.
- Prefer stable names such as:
  - `audio-module.md`
  - `combat-system.md`
  - `enemy-ai.md`
- Keep these docs implementation-facing and fast to scan.
- Treat them as the single source of truth for current module behavior.

## Guardrails

- Do not backfill old projects unless the user explicitly asks.
- Do not move docs outside:
  `C:\Users\jinji\Documents\GitHub\WebGameDevPlace\WebGameDev Docs`
- Do not keep a rolling master changelog in place of task notes.
