import { describe, expect, it } from 'vitest';
import { inVent, shouldCrackScuba, type VentRegion } from './water';

describe('inVent geometry', () => {
  const vents: VentRegion[] = [
    { x: 400, topY: 440, width: 56 }, // band 372..428
    { x: 900, topY: 430, width: 64 }, // band 868..932
  ];

  it('is true inside a vent column below its top', () => {
    expect(inVent(400, 500, vents)).toBe(true);
    expect(inVent(900, 430, vents)).toBe(true); // exactly at topY counts (>=)
  });

  it('is true at the exact horizontal band edges', () => {
    expect(inVent(372, 460, vents)).toBe(true); // 400 - 56/2
    expect(inVent(428, 460, vents)).toBe(true); // 400 + 56/2
  });

  it('is false just outside the horizontal band', () => {
    expect(inVent(371, 460, vents)).toBe(false);
    expect(inVent(429, 460, vents)).toBe(false);
  });

  it('is false above the vent top (player higher than the column)', () => {
    expect(inVent(400, 439, vents)).toBe(false);
  });

  it('is false with no vents', () => {
    expect(inVent(400, 500, [])).toBe(false);
  });
});

describe('shouldCrackScuba', () => {
  it('cracks on a hit that lands on the body', () => {
    expect(shouldCrackScuba('hurt', 'contact')).toBe(true);
    expect(shouldCrackScuba('potioned', 'projectile')).toBe(true);
    expect(shouldCrackScuba('revived', 'contact')).toBe(true);
  });

  it('never cracks on drowning damage', () => {
    expect(shouldCrackScuba('hurt', 'drowning')).toBe(false);
    expect(shouldCrackScuba('dead', 'drowning')).toBe(false);
  });

  it('does not crack when the hit was ignored (i-frames) or absorbed (shield)', () => {
    expect(shouldCrackScuba('ignored', 'contact')).toBe(false);
    expect(shouldCrackScuba('absorbed', 'projectile')).toBe(false);
  });

  it('does not crack on a killing blow', () => {
    expect(shouldCrackScuba('dead', 'contact')).toBe(false);
  });
});
