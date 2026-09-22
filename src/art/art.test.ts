import { describe, expect, it } from 'vitest';
import * as city from './city';
import * as common from './common';
import * as forest from './forest';
import * as helpers from './helpers';
import * as lake from './lake';
import * as powerMonsters from './powerMonsters';
import * as rail from './rail';
import * as shop from './shop';

describe('art module exports', () => {
  it('helpers exports bakeTint and bakeSheet functions', () => {
    expect(typeof helpers.bakeTint).toBe('function');
    expect(typeof helpers.bakeSheet).toBe('function');
  });

  it('common exports generateCommonTextures function', () => {
    expect(Object.keys(common)).toEqual(['generateCommonTextures']);
    expect(typeof common.generateCommonTextures).toBe('function');
  });

  it('city exports generateCityTextures function', () => {
    expect(Object.keys(city)).toEqual(['generateCityTextures']);
    expect(typeof city.generateCityTextures).toBe('function');
  });

  it('forest exports generateForestTextures function', () => {
    expect(Object.keys(forest)).toEqual(['generateForestTextures']);
    expect(typeof forest.generateForestTextures).toBe('function');
  });

  it('rail exports generateRailTextures function', () => {
    expect(Object.keys(rail)).toEqual(['generateRailTextures']);
    expect(typeof rail.generateRailTextures).toBe('function');
  });

  it('powerMonsters exports generatePowerMonsterSheets and registerPowerMonsterAnims', () => {
    expect(Object.keys(powerMonsters).sort()).toEqual([
      'generatePowerMonsterSheets',
      'registerPowerMonsterAnims',
    ]);
    expect(typeof powerMonsters.generatePowerMonsterSheets).toBe('function');
    expect(typeof powerMonsters.registerPowerMonsterAnims).toBe('function');
  });

  it('lake exports generateLakeTextures, krakenEyes, and registerLakeAnims', () => {
    expect(Object.keys(lake).sort()).toEqual([
      'generateLakeTextures',
      'krakenEyes',
      'registerLakeAnims',
    ]);
    expect(typeof lake.generateLakeTextures).toBe('function');
    expect(typeof lake.registerLakeAnims).toBe('function');
  });

  // Henry and Wes: the green kraken has 4 eyes, and 6 when it gets mad.
  it('kraken has 4 eyes when calm and 6 when enraged', () => {
    expect(lake.krakenEyes(false)).toHaveLength(4);
    expect(lake.krakenEyes(true)).toHaveLength(6);
  });

  it('kraken eyes stay inside the 96x96 head frame and never overlap', () => {
    const cx = 48;
    const cy = 44;
    for (const enraged of [false, true]) {
      const eyes = lake.krakenEyes(enraged);
      for (const e of eyes) {
        // socket rim is r + 1.5
        expect(cx + e.dx - e.r - 1.5).toBeGreaterThanOrEqual(0);
        expect(cx + e.dx + e.r + 1.5).toBeLessThanOrEqual(96);
        expect(cy + e.dy - e.r - 1.5).toBeGreaterThanOrEqual(0);
      }
      for (let i = 0; i < eyes.length; i++) {
        for (let j = i + 1; j < eyes.length; j++) {
          const d = Math.hypot(eyes[i].dx - eyes[j].dx, eyes[i].dy - eyes[j].dy);
          expect(d).toBeGreaterThan(eyes[i].r + eyes[j].r + 3);
        }
      }
    }
  });

  it('shop exports generateShopTextures function', () => {
    expect(Object.keys(shop)).toEqual(['generateShopTextures']);
    expect(typeof shop.generateShopTextures).toBe('function');
  });
});
