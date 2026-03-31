# GunFightMan Practice Runtime Flicker Fix

## Goal

- Reproduce the reported screen flicker inside `gunfightman-practice`
- Identify whether the issue comes from Phaser rendering, React overlay updates, or platform lifecycle wiring
- Ship a fix that keeps the play surface stable during normal HUD updates

## Findings

- The flicker reproduced together with repeated Phaser boot logs in the browser console
- The page also raised `Maximum update depth exceeded` and `Too many active WebGL contexts`
- Root cause: the runtime mount effect in `src/playgrounds/gunfightman-practice/runtime.tsx` was being retriggered by React updates, so the Phaser game instance kept getting destroyed and recreated

## Implementation Plan

- Make the Phaser boot effect run only for the component mount lifecycle
- Keep the latest outer handle callback in a ref so adapter integration still receives the current game handle
- Re-test direct project launch to confirm the canvas remains stable and only one Phaser instance stays active
