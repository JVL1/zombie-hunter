import { describe, expect, it } from 'vitest';
import * as city from './city';
import * as common from './common';
import * as forest from './forest';
import * as helpers from './helpers';
import * as rail from './rail';

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
});
