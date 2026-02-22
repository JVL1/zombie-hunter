# Stepping Stones & Downward Sword Slam

**Date:** 2026-02-22
**Status:** Designed
**Suggested by:** Henry & Josh

## Overview

Add floating staircase platform clusters throughout levels that let the player climb up and attack zombies from above with a new downward sword slam move. Zombies hilariously try (and fail) to follow the player up.

## Stepping Stone Platforms

- Small floating platforms arranged in ascending clusters (3-5 stones each, going up like a staircase)
- Each stone is 2-3 tiles wide (64-96px) with vertical gaps between steps
- 3-4 clusters scattered across Level 1 between ground sections
- Uses the existing static platform/collider system — no new physics needed
- Gives the level vertical variety and tactical options

## Downward Sword Slam (New Attack)

- **Trigger:** Press A while in the air and falling (positive Y velocity)
- **Hitbox:** Rectangle below the player (32x40), positioned under the sprite, active for 150ms
- **Damage:** 1.5x normal sword damage — rewards the risk of dropping down
- **Impact effects:**
  - Big splatter burst (larger than normal hit)
  - Screen shake on contact
  - Player bounces back up slightly (pogo effect) — enables chaining slams on groups
- **Cooldown:** Same 300ms as regular sword attack
- **Animation:** Player flips sword downward (can reuse attack frames flipped, or add a dedicated air-slam animation later)

## Zombie Jump-Fail Behavior

- **When:** Zombie is in chase mode and player is directly above on a stepping stone
- **What:** Zombie attempts a small jump (30-50% of platform height), fails, falls back down
- **Timing:** Repeats every 1-2 seconds while player remains above
- **Polish:** Small dust-puff particle effect when zombie lands back on the ground
- **Why it's fun:** Makes the player feel powerful and looks funny — zombies desperately flailing below

## Technical Notes

- Stepping stones are just smaller versions of existing `createPlatform()` — same staticGroup, same colliders
- Downward slam needs a new branch in `Player.attack()` that checks `body.velocity.y > 0` and `!body.blocked.down`
- Pogo bounce: `setVelocityY(-250)` on slam hit to pop the player back up
- Zombie jump-fail: Add a `tryJump()` method to Zombie that triggers when `isChasing && playerAbove` — small `setVelocityY(-150)` that doesn't reach platform height
- Screen shake: `this.cameras.main.shake(100, 0.005)` on slam impact
