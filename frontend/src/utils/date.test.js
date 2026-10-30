import { describe, expect, it } from 'vitest';
import { daysAgoISO, isValidISODate, monthRangeISO, toISODate } from './date';

describe('dates', () => {
  it('toISODate local tareekh deta hai (UTC nahi)', () => {
    expect(toISODate(new Date(2026, 9, 5))).toBe('2026-10-05');
    expect(toISODate(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
    expect(toISODate(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('daysAgoISO mahine/saal ki hadd paar karta hai', () => {
    const from = new Date(2026, 2, 1);
    expect(daysAgoISO(0, from)).toBe('2026-03-01');
    expect(daysAgoISO(1, from)).toBe('2026-02-28');
    expect(daysAgoISO(30, new Date(2026, 0, 15))).toBe('2025-12-16');
    expect(daysAgoISO(1, new Date(2024, 2, 1))).toBe('2024-02-29');
  });

  it('isValidISODate asli tareekhein hi maanta hai', () => {
    expect(isValidISODate('2026-10-11')).toBe(true);
    expect(isValidISODate('2024-02-29')).toBe(true);
    for (const bad of ['2026-02-30', '2026-13-01', '2026-00-10', '26-10-11', '2026-10-1', '', null, undefined, 20261011]) {
      expect(isValidISODate(bad)).toBe(false);
    }
  });

  it('monthRangeISO leap year aur 30/31 din', () => {
    expect(monthRangeISO(2024, 2)).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(monthRangeISO(2026, 2)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthRangeISO(2026, 4)).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    expect(monthRangeISO(2026, 12)).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});