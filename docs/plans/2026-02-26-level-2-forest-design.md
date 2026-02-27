# Level 2 — Broken Down Forest Design

## Overview

Level 2 takes place in a decayed, broken-down forest filled with zombie wildlife, mutated plant creatures, and spider-zombie hybrids. The level culminates in a boss fight against a Giant Crab-Spider Zombie that emerges from a cocoon in a web-covered grove.

## Boss: Giant Crab-Spider Zombie

### Visual Design
A mutated humanoid zombie wearing torn jeans/shorts. Spider-crab legs burst through the torn fabric, revealing the horrific transformation beneath. The creature perches in a silk cocoon within a web-covered grove of dead trees before the fight begins.

### Attacks

**Charging Laser Eyes**
- Eyes glow red for 1.5 seconds (warning phase)
- Fires a powerful beam in a straight line
- Player must reposition during the charge-up window
- Damage: 25 HP

**Leg Stomp Shockwave**
- Slams spider legs into the ground
- Creates a shockwave that travels horizontally across the arena
- Player must jump to avoid
- Damage: 10 HP

**Ground Crack (Environmental Hazard)**
- Stomps have ~30% chance to crack the floor open
- Cracks reveal molten lava beneath
- Falling into lava = instant death
- Maximum 3-4 cracks at once
- When a new crack forms, the oldest one seals up
- Keeps fight chaotic but fair

### Movement
- Skitters sideways like a crab
- Fast lateral strafing, unpredictable positioning
- Gets faster below 50% HP

### Stats
- HP: 250
- Contact damage: 15
- Attack frequency: Every 3-4 seconds (laser OR stomp)

### Arena
- Web-covered grove clearing
- Dead trees form backdrop, draped in webs
- Cocoon in center (boss spawn point)
- Destructible floor with lava beneath

## Regular Enemies

### Zombie Wildlife (Fast/Aggressive)

**Zombie Deer**
- Charges at player on sight
- Fast movement speed
- HP: 25
- Antlers deal contact damage

**Zombie Wolf**
- Pounces from a distance
- Hunts in pairs when possible
- HP: 35

### Mutated Plant Zombies (Slow/Tanky)

- Humanoid zombies overgrown with fungus and vines
- Movement speed: 0.5x normal zombie
- HP: 70
- Leaves a brief poison cloud on death (1 second duration, small damage if player stands in it)

### Spider Zombie Hybrids (Mini-boss Foreshadowing)

- Smaller crab-spider creatures (~0.5x boss scale)
- Can skitter sideways like the boss
- Shoots a single quick laser bolt (no charge-up, lower damage)
- HP: 40
- Appear sparingly (3-4 total in level) to build tension

### Spawn Distribution
- **Early forest:** Mostly zombie wildlife (deer, wolves)
- **Mid forest:** Plant zombies mixed in
- **Late forest (near boss):** Spider hybrids appear

## Environment & Layout

### Setting
Decayed, broken-down forest. Dead trees, rotting logs, thick undergrowth. Darker color palette than Level 1 — greens, browns, deep shadows.

### Level Structure (3200px total width)

**1. Forest Edge (0-800px)**
- Transition from city ruins
- Sparse trees, open ground
- Zombie deer introduce the level
- Easy platforming to ease player in

**2. Tree Canopy Zone (800-1600px)**
- Vertical platforming section
- Jump between fallen logs, thick branches, tree stumps at varying heights
- Zombie wolves patrol platforms
- Stepping stones continue from Level 1 mechanics

**3. Dense Undergrowth (1600-2200px)**
- Claustrophobic section
- Tight corridors between thick brush
- Plant zombies ambush from foliage
- Lower visibility, tense pacing

**4. Spider Territory (2200-2800px)**
- Webs appear on trees (visual foreshadowing)
- First spider zombie hybrids
- Webs are decorative only (no gameplay effect)
- Signals the boss is near

**5. Web Grove Arena (2800-3200px)**
- Boss arena
- Circular clearing surrounded by dead trees draped in webs
- Cocoon visible in center
- Floor can crack to reveal lava

### Parallax Backgrounds
4 layers for depth:
1. Distant dead trees (slowest scroll)
2. Mid-ground fog
3. Foreground brambles
4. Atmospheric haze overlay

## Boss Encounter Flow

### Trigger
Player crosses x > 2700px

### Sequence
1. Camera stops following player, pans to cocoon
2. Cocoon pulses and glows (1 second)
3. Crab-Spider Zombie bursts out — silk strands fly, cocoon shreds
4. Boss lands on ground, skitters into fighting position
5. Camera locks to arena bounds (2600-3200px)
6. Boss health bar appears: "CRAB-SPIDER ABOMINATION"
7. Fight begins

### Attack Pattern
- Skitters sideways constantly throughout fight
- Every 3-4 seconds: Either laser (charge + fire) OR leg stomp
- Stomp has ~30% chance to crack a new floor section
- Below 50% HP: Movement speed increases, attack frequency increases

### Defeat Sequence
1. Boss collapses, legs curl inward (spider death pose)
2. Webs on surrounding trees dissolve and fade
3. Any remaining lava cracks seal up (safety)
4. Key #2 drops from boss corpse
5. Victory screen transition after key pickup

## Technical Implementation

### New Assets Required

**Sprites:**
- Crab-Spider Zombie boss (idle, skitter, laser-charge, laser-fire, stomp, death)
- Zombie deer (walk, run, death)
- Zombie wolf (walk, pounce, death)
- Plant zombie (idle, walk, death, poison-cloud)
- Spider zombie hybrid (skitter, laser-shot, death)
- Cocoon (intact, bursting animation)
- Web decorations (various sizes)
- Lava crack (opening animation, lava glow loop)

**Tiles:**
- Forest floor (dirt, grass, roots) — 32x32
- Tree platforms (branches, logs, stumps) — 32x32
- Undergrowth/brush decorations

**Backgrounds:**
- 4-layer forest parallax PNGs (dead trees, fog, brambles, haze)

### New Systems

**LaserAttack.ts**
- Charge-up visual effect (glowing eyes)
- Beam projectile that travels in straight line
- Damage on contact with player
- Reusable for spider hybrids (quick shot variant)

**Shockwave.ts**
- Ground-traveling hitbox
- Spawns at stomp location, expands outward
- Player must jump to avoid
- Visual: dust/debris particles

**CrackingGround.ts**
- Tracks floor tile states (solid, cracking, open, sealed)
- Manages max crack limit (3-4)
- Seals oldest crack when new one forms
- Lava hazard: instant death on contact

**PoisonCloud.ts**
- Timed area damage effect
- Spawns on plant zombie death
- 1 second duration, small tick damage
- Reusable for future poison enemies/traps

### Scene Structure

**Level2Scene.ts**
- Extends same pattern as Level1Scene
- New enemy types: ZombieDeer, ZombieWolf, PlantZombie, SpiderHybrid
- New boss: CrabSpiderBoss
- Forest-specific parallax backgrounds
- Cracking ground system for boss arena

## Reward

- **Key #2** — Second of five keys needed for the portal
- Coins from all enemies (5 coins each, same as Level 1)

## Connection to Progression

- **Before Level 2:** Shop scene (Blacksmith + Apocalypse Shop)
- **After Level 2:** Shop scene, then Level 3 (Abandoned Railroad)
- Player should have opportunity to upgrade sword before this boss (laser + shockwave combo is challenging)
