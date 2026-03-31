# GunFightMan Practice Clean Screen Pause Panel

## Goal

- Remove the always-on external HUD shell that is crowding the playfield
- Keep the active game view visually focused on the canvas
- Move status, control reminders, and progress readout into the `Esc` pause surface

## Direction

- Default play should show the game scene, in-canvas prompts, and only situational modal UI
- The platform pause panel should become the main place for objective, ammo, hull, wallet, combo, kill count, and control reminders
- Shop selection and run-end restart can stay as contextual modals because they are deliberate interruption states

## Implementation Plan

- Add an optional runtime pause snapshot contract to the platform handle
- Let `gunfightman-practice` expose its current combat state to the pause panel
- Remove the top and bottom overlay HUD bands from the project runtime
- Re-style the pause panel so it reads like an embedded game surface instead of an app shell card
