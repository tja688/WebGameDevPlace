# GunFightMan Practice Project Overview

- Project id: `gunfightman-practice`
- Primary runtime: `phaser`
- Source repository: `C:\Users\jinji\Documents\GitHub\GunFightManPractice`
- Entry path: `src/playgrounds/gunfightman-practice/`

## Current Shape

- Phaser drives the combat scene and simulation
- DOM UI is disclosure-based: only situational modals stay on top of the game during play, while routine status moves into the `Esc` pause surface
- The project runs inside the shared Web Game Dev Place launcher and play route system
- Runtime mounting is one-shot per play-session entry; HUD and menu updates must not recreate the Phaser game instance

Updated: 2026-03-31
