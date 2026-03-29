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
- HUD and menus are embedded overlays, not an outer dashboard frame

Updated: 2026-03-29
