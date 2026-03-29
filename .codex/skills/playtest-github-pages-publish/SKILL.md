---
name: playtest-github-pages-publish
description: Prepare a project in Web Game Dev Place for GitHub Pages playtest sharing. Use only when the user explicitly asks to publish or share a project as a play test. Create a dedicated branch, make the shared build enter the target project directly, and remove home-return or extra launcher flows from the published branch.
---

# Playtest GitHub Pages Publish

Read `README.md` and inspect the target project before starting.

## Scope

This skill defines the workflow contract only. It does not assume GitHub Actions, Pages automation, or repo-wide Pages infrastructure already exists.

## Workflow

1. Confirm the target project id.
2. Create a dedicated publish branch for the playtest share.
3. Rework the branch entry behavior so the app opens directly into the target project play route.
4. Remove launcher-first behavior from the shared branch.
5. Remove home-return and extra platform flows from the shared branch if they distract from pure playtest use.
6. Verify the result feels like a direct playable entry, not a workbench.

## Branch Contract

- The branch exists for a single playtest share target.
- The default page should resolve directly into the selected project.
- The shared page should be clean and obvious for external testers.
- Prefer the smallest platform surface needed for the playtest.

## Guardrails

- Do not add repo-wide Pages automation unless the user explicitly asks for it.
- Do not assume Vite `base` or GitHub workflow support already exists.
- Do not leave the branch in launcher mode.
