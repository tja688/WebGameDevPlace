# AGENTS.md

Read [README.md](C:\Users\jinji\Documents\GitHub\WebGameDevPlace\README.md) before making project changes.

## Purpose

This file defines the AI-facing architectural contract for Web Game Dev Place. It is intentionally short. Long operational procedures belong in project-local skills under `.codex/skills/`.

## Non-Negotiable Rules

- Treat the repo as **project-first**, not runtime-first.
- Do not reintroduce public template galleries, template cards, or runtime-grouped launcher flows.
- Do not wrap the play surface in a dashboard-style shell during active play.
- Keep the default play state visually centered on the game itself.
- Use existing runtime adapters and platform contracts instead of inventing parallel entry systems.
- Keep `main` runnable and maintainable.

## Read Order

1. Read [README.md](C:\Users\jinji\Documents\GitHub\WebGameDevPlace\README.md)
2. Read the relevant project-local skill under `.codex/skills/`
3. Inspect the target project under `src/playgrounds/`
4. Inspect the target docs under `WebGameDev Docs/`

## Required Skills

Use these repo-local skills when their trigger matches:

- `.codex/skills/new-web-game-dev/`
- `.codex/skills/web-game-dev-doc/`
- `.codex/skills/playtest-github-pages-publish/`

Do not move these skills outside this repository.

## Documentation Rules Per Project

Every newly created project must create its documentation root at:

`C:\Users\jinji\Documents\GitHub\WebGameDevPlace\WebGameDev Docs\<project-folder>\`

Required subfolders:

- `dev plan`
- `reference document`

Rules:

- Every development task creates a new dated note inside `dev plan`
- File naming rule: `YYYY-MM-DD - <development-goal>.md`
- Do not maintain one endlessly rewritten dev log
- `reference document` holds unique module fact docs
- Each module fact doc is globally unique inside the project doc set
- Do not create duplicates for the same module under alternate names
- When implementation changes, update the existing module doc
- Append a final line in every updated reference doc: `Updated: YYYY-MM-DD`

## Platform Constraints

- Home route: `#/`
- Play route: `#/play/<project-id>`
- `Esc` opens the default pause panel
- Default pause panel is minimal: `Resume` and `Home`
- Do not add global debug dashboards or save-management shells unless explicitly requested
- For automated gameplay verification or launch flows targeting a known project, use the direct project route instead of opening the home screen first
- Preferred command: `npm run dev:project -- <project-id>`

## Launch Commands

- `npm run dev:home` opens the launcher home route
- `npm run dev:project -- <project-id>` opens a specific project play route
- `start-web-game-dev-place.bat` is the Windows one-click launcher for the home route

## UI Constraints

- The launcher is a project library, not a runtime catalog
- Runtime may appear as a badge, never as the primary grouping structure
- No preset empty project previews or fake populated panels
- If there are no projects or no search matches, show a real empty state

## Documentation vs Skills

- `README.md` explains the repo to humans
- `AGENTS.md` defines AI architecture and workflow constraints
- `.codex/skills/` carries reusable operational workflows

If a rule becomes procedural and repetitive, move that procedure into a project-local skill instead of bloating this file.
