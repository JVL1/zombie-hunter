import { describe, expect, it } from 'vitest';
import { CANDY } from '../config';
import { collect, createSourCandyState, knockLoose, tryFeed } from './sourCandy';

describe('sour candy (Wes)', () => {
  it('starts empty and never knocked', () => {
    const s = createSourCandyState();
    expect(s.count).toBe(0);
    expect(knockLoose(s, 0, 1000).drop).toBe(true);
  });

  it('collects up to the cap and no further', () => {
    let s = createSourCandyState();
    for (let i = 0; i < CANDY.sourCandyCap + 2; i++) s = collect(s);
    expect(s.count).toBe(CANDY.sourCandyCap);
    expect(collect(createSourCandyState(), 1).count).toBe(1);
  });

  it('feeds only with a candy AND an open mouth', () => {
    const empty = createSourCandyState();
    expect(tryFeed(empty, true).fed).toBe(false);

    const one = collect(empty);
    const closed = tryFeed(one, false);
    expect(closed.fed).toBe(false);
    expect(closed.state.count).toBe(1);

    const open = tryFeed(one, true);
    expect(open.fed).toBe(true);
    expect(open.state.count).toBe(0);
  });

  it('knocks a candy loose at most once per cooldown', () => {
    const first = knockLoose(createSourCandyState(), 5000, 1500);
    expect(first.drop).toBe(true);
    expect(knockLoose(first.state, 6499, 1500).drop).toBe(false);
    expect(knockLoose(first.state, 6500, 1500).drop).toBe(true);
  });

  it('does not mutate its input', () => {
    const s = collect(createSourCandyState());
    tryFeed(s, true);
    knockLoose(s, 100, 10);
    expect(s.count).toBe(1);
    expect(s.lastKnockAt).toBe(Number.NEGATIVE_INFINITY);
  });
});
