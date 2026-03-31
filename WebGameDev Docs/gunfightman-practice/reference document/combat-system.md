# GunFightMan Practice Combat System

## Core Loop

- Shoot to attack and recoil-move at the same time
- Build combo tiers to unlock splash radius and bonus damage
- Clear combat phases, dock with shop boats, buy upgrades, then finish the boss phase

## Imported Systems

- Player raft combat with recoil-based movement
- Enemy waves: flower, hand, pirate, boss
- Upgrade shop with React-driven choice overlay
- Phase progression, night event, restart flow, and boss break state

## Integration Notes

- The original external app shell was removed during migration
- Combat now runs inside the platform play route as a full-screen runtime
- Active play keeps the canvas visually clear; only shop and result states raise DOM modals
- Routine combat readout and control hints are exposed through the `Esc` pause panel snapshot instead of a permanent top or bottom HUD shell
- React HUD state is fed from the scene bridge, but those UI updates must stay decoupled from Phaser boot and destroy lifecycle

Updated: 2026-03-31
