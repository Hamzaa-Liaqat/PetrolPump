import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, titleFor } from './navigation';

describe('titleFor', () => {
  it('har page ka apna title', () => {
    for (const item of NAV_ITEMS) expect(titleFor(item.path)).toBe(`${item.label} - FuelTrack`);
  });
  it('titles unique, anjaan raaste par sirf brand', () => {
    const titles = NAV_ITEMS.map((item) => titleFor(item.path));
    expect(new Set(titles).size).toBe(titles.length);
    expect(titleFor('/nahi-hai')).toBe('FuelTrack');
    expect(titleFor('/login')).toBe('FuelTrack');
  });
});