# Web Game Dev Place

Web Game Dev Place is a local-first workbench for browser game experiments. It is not a single game and it is not a public template gallery. The repo exists to host **project-sized gameplay experiments** behind one shared platform shell.

## What This Repo Is

- A project launcher for current game experiments
- A shared runtime platform for Phaser, PixiJS, Three.js, and Babylon.js projects
- A place to validate play loops, interaction systems, presentation ideas, and technical spikes

## What This Repo Is Not

- Not a runtime-first showcase
- Not a template browser
- Not a long-lived branch-per-project workflow
- Not a general dashboard wrapped around the play surface

## Quick Start

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run dev:home
npm run dev:project -- gunfightman-practice
npm run typecheck
npm run build
```

Windows one-click launcher:

```bash
start-web-game-dev-place.bat
```

## Stack

- React 19 for the platform shell
- Vite for local dev and production build
- TypeScript for shared contracts
- Phaser 3 for 2D gameplay-first projects
- PixiJS for 2D rendering and effects-oriented projects
- Three.js for explicit 3D scene experiments
- Babylon.js for heavier 3D engine-style experiments

## Product Structure

The app has only two platform states:

- `#/` for the start screen
- `#/play/<project-id>` for direct play entry

The start screen is project-first:

- recent development
- project search
- project card library

The play screen is game-first:

- the runtime owns the viewport
- the platform shell stays out of sight during play
- `Esc` opens a minimal pause panel with `Resume` and `Home`

## Launch Paths

- `npm run dev` starts Vite without forcing a route
- `npm run dev:home` starts the dev server and opens the launcher home route
- `npm run dev:project -- <project-id>` starts the dev server and opens the target project directly at `#/play/<project-id>`
- `start-web-game-dev-place.bat` is the one-click Windows launcher for the home route

Use direct project launch for gameplay checks and automation when the target project is already known.

## Architecture Rules

- One project owns one primary runtime
- Runtime is metadata, not the organizing principle of the UI
- The platform normalizes lifecycle, not engine APIs
- The play surface must remain game-dominant
- Templates are not exposed as first-class repo content anymore

## Directory Shape

```txt
src/
  app/         platform shell and routing
  platform/    runtime lifecycle and adapters
  playgrounds/ current project entries
```

The `playgrounds/` directory is now the visible project inventory. Old public template flows are intentionally removed.

## Adding a New Project

Do not invent a new ad hoc workflow.

Use the local skill at `.codex/skills/new-web-game-dev/` and follow its contract:

1. Create the project doc root under `WebGameDev Docs/<project-folder>/`
2. Create `dev plan/`
3. Create `reference document/`
4. Seed the initial dev-plan note and reference note
5. Add the project into `src/playgrounds/`
6. Register it in the project registry

## Documentation Contract

All project docs live under:

`C:\Users\jinji\Documents\GitHub\WebGameDevPlace\WebGameDev Docs`

Each new project gets:

```txt
WebGameDev Docs/
  <project-folder>/
    dev plan/
    reference document/
```

Rules:

- `dev plan/` stores dated task notes named `YYYY-MM-DD - <development-goal>.md`
- `reference document/` stores unique source-of-truth module docs
- Module docs are updated in place instead of duplicated
- Every updated reference doc ends with `Updated: YYYY-MM-DD`

## AI Workflow

`AGENTS.md` is the AI-facing contract for this repo.

Agents must:

- read `README.md` first
- follow project-first organization
- use project-local skills instead of embedding long procedures in one file
- keep docs aligned with actual implementation
- use direct project launch for gameplay validation when a specific project is under test

## Current Scope

- Existing sample projects stay as project samples
- This repo currently focuses on platform-layer usability and structure
- GitHub Pages playtest publishing is defined as a skill workflow, not full repo automation yet
