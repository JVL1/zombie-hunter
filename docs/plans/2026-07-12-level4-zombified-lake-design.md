# Level 4 — THE ZOMBIFIED LAKE

Co-designed with Henry, 2026-07-12. Henry's calls: full-underwater level, scuba gear
that breaks, drowned kraken boss with tentacle-guarded head, triple-bubble enrage.

## Problem

The game ends at Level 3 holding 3 of the 5 portal keys with nowhere to go. Henry's
Level 4 vision — a creepy zombified lake with blood in the water — needs three
mechanics the engine doesn't have yet: swimming, a breathing meter, and a
projectile-firing boss.

## Goals

- Level 4 playable end-to-end: Level 3 Victory → Shop → Level 4 → Sunken Beast →
  key #4 → Victory → MainMenu (Level 4 becomes the last built level)
- Swim movement: ↑ to swim up, dash becomes a torpedo burst with i-frames, sword
  combo works normally underwater
- Breathing meter (~30 s of air): low-air warning text "YOU NEED TO GO UP TO
  BREATHE"; at zero, damage ticks with red screen pulse and heartbeat SFX —
  survivable by surfacing
- Scuba gear (Henry's invention): hidden pickup, infinite air while worn, visibly
  cracks on each hit taken, shatters on the 5th
- Bubble streams rising from lakebed cracks refill the meter; two in the boss arena
- Water enemies: Drowned Zombie (slow floaty swimmer), Zombie Fish (small fast pack
  darters), Zombie Eel (wreck ambush lunge)
- Power monsters present: Gem Guardian and Titan Zombie
- Boss: THE SUNKEN BEAST — drowned kraken. Tentacles guard the head; chop a
  tentacle to open a window, slash the head before it regrows. Beak fires aimed
  laser bubbles; at 50% HP it enrages: red glowing eyes, triple-bubble spread

## Non-Goals

- The portal itself (the 5-key payoff) — that is Level 5 content
- The "water demon" Blacksmith weapon — recorded for the shop later, unlock timing
  TBD with Henry
- Water anywhere outside Level 4 — no swimming retrofit to Levels 1–3
- Scuba persistence — the gear is found fresh each run and does not survive the level

## Acceptance Criteria

- [ ] Beating Level 3 routes through the Shop to Level 4; beating Level 4 grants
      key #4 (`keyIndex: 3`) and returns to MainMenu
- [ ] Player swims (↑ rises, gravity is gentle underwater), torpedo dash has
      i-frames, double jump and slam are disabled in water, sword combo works
- [ ] Air meter drains over ~30 s, warns at low air, ticks damage at zero; damage
      stops immediately on surfacing or entering a bubble stream
- [ ] Scuba pickup grants infinite air, shows crack stages per hit taken, breaks on
      the 5th hit and the meter resumes
- [ ] Sunken Beast fight: tentacles block the head, a chopped tentacle opens a
      damage window then regrows, laser bubbles aim at the player, enrage fires
      3-bubble spreads
- [ ] All existing vitest invariants pass; new invariants cover water geometry
      (surface strip exists, vents reachable, scuba placed in-bounds, spawns clear
      of solids)
- [ ] MainMenu key 4 replays the level; GameOver retries it with buffs cleared

## Architecture

Water is a **level-def property, not an engine rewrite**. `LevelDef` gains an
optional `water` block; levels without it behave exactly as today. The one new
deep module is the `Kraken` entity — everything else extends proven seams.

### LevelDef (src/levels.ts — stays Phaser-free)

```ts
water?: {
  surfaceY: number;          // top of water; above it = air, normal physics
  vents: number[];           // bubble-stream x positions (rise from groundY)
  scuba: { x: number; y: number }; // hidden in an eel-guarded wreck
}
```

`BossDef` becomes a discriminated union: the current shape is `kind: 'walker'`
(default, so Levels 1–3 defs barely change); `kind: 'kraken'` carries tentacle
count/regrow ms, bubble speed/interval, and enrage spread. The union keeps the
walker fields out of the kraken and vice versa.

New spawn variants in `ZOMBIE.variants`: `drowned` (base zombie, `swims: true`
flag, slow float-chase). Zombie Fish and Zombie Eel are **new small entities**
(`src/entities/Fish.ts`, `Eel.ts`) — their movement (pack darting; anchored
lunge) doesn't fit the humanoid state machine. Eels reuse the telegraphed-lunge
timing constants from `ZOMBIE`.

### Swim mode (src/entities/Player.ts)

A `swimming` flag set by the scene each frame (`player.y > surfaceY`). In water:
reduced gravity via the same `body.setGravityY` offset trick the flight buff
uses, ↑/jump thrusts toward a rise-velocity cap, dash keeps its i-frames with a
water-tuned speed (torpedo burst), double jump and slam are gated off. Above the
surface, normal physics resume — jumping out of the water works like a dolphin
arc for free. Tunables live in a new `WATER` block in `config.ts`.

### Air meter (src/core/air.ts — pure, vitest-covered)

Pure functions over a small state record, mirroring `damage.ts`:
`tickAir(state, dt, submerged, inVent)` → drain/refill/no-op;
`scubaHit(state)` → durability 5→0 with a `broke` flag;
thresholds expose `warning` (low air) and `drowning` (zero). The scene applies
drowning ticks through the existing `resolveDamage` pipeline — no hand-rolled HP
math. Scuba durability decrements on the player's existing hurt event while worn.

### Kraken (src/entities/Kraken.ts — new)

Own state machine (LURKING → FIGHTING → ENRAGED → DEAD), deliberately separate
from `Boss` — it shares no charge/leap/walk behavior, so stretching `Boss` would
tangle both. Owns: 2–3 tentacle sprites (each an HP-bearing arcade body; killed
tentacle opens a head-damage window, regrows after a timer), a laser-bubble
projectile group (aimed at the player; enrage fires 3 in a spread), and the
enrage tint/eye glow. `BaseLevelScene` branches once on `boss.kind` when
creating the encounter; the cinematic, HP bar, and key-drop wiring are shared.

### Scene & HUD

`Level4Scene` extends `BaseLevelScene` like the others (`buildBackdrop`/
`buildTerrain`/`buildAmbience` for the blood-red water look: red-tinted murk
overlay, floating debris, moonlight shafts, blood particle wisps). The air meter
renders in the existing HUD scene next to the buff row: a draining bar, warning
text at the low threshold, red vignette pulse + heartbeat SFX (SynthAudio) while
drowning. Scuba shows as an icon with crack stages.

### Art (src/art/lake.ts)

`generateLakeTextures(scene)` — water overlay bands, wreck/boat props, vent
bubbles, scuba icon + crack stages, fish/eel sheets, kraken body/tentacle/bubble.
All baked (Canvas-safe), invoked from `PreloadScene.create()` like every theme.

## Testing

- `air.test.ts`: drain/refill/warning/drowning/scuba matrix (pure, no Phaser)
- `levels.test.ts` gains water invariants: surface strip leaves headroom, vents
  sit between spawn and arena, scuba position is in-bounds and submerged, spawn
  clearance rules extended to fish/eel spawns
- `config.test.ts`: WATER tunables sane (air duration > warning threshold, etc.)
- Browser playtest (agent-browser): full Level 4 run — swim, drown-and-survive,
  scuba break, kraken kill, key #4 grant

## Open Questions

- Exact scuba hiding spot (an eel-guarded wreck; final coordinates settle when the
  level geometry is laid out — the placement invariants are the arbiter)
- Fish/eel sprite look — first non-humanoid bakes; iterate with Henry at the screen
- Whether drowned zombies need a distinct bake color or read fine as the base
  zombie floating (decide in playtest)
