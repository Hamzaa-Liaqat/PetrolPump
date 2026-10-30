import { describe, expect, it } from 'vitest';
import { MAX_FUTURE_DAYS, priceChange, toIsoOrUndefined, validateRateForm } from './rates';

const now = new Date('2026-10-11T10:00:00Z');
const ok = { fuelType: 'petrol', rate: '265.5', effectiveFrom: '' };

describe('validateRateForm', () => {
  it('sahi form', () => {
    expect(validateRateForm(ok, now)).toEqual({});
  });
  it('fuel aur rate lazmi, rate 0 se zyada', () => {
    expect(validateRateForm({ ...ok, fuelType: '' }, now).fuel_type).toBeTruthy();
    for (const bad of ['', '0', '0.00', 'abc', '12.345', '-5']) {
      expect(validateRateForm({ ...ok, rate: bad }, now).rate).toBeTruthy();
    }
  });
  it('7 din se zyada aage ki tareekh reject, 7 din ke andar theek', () => {
    const inside = new Date(now.getTime() + (MAX_FUTURE_DAYS * 86400000 - 1000)).toISOString();
    const outside = new Date(now.getTime() + MAX_FUTURE_DAYS * 86400000 + 1000).toISOString();
    expect(validateRateForm({ ...ok, effectiveFrom: inside }, now)).toEqual({});
    expect(validateRateForm({ ...ok, effectiveFrom: outside }, now).effective_from).toContain('7');
  });
  it('ghalat tareekh reject, purani tareekh frontend par theek (server rokta hai)', () => {
    expect(validateRateForm({ ...ok, effectiveFrom: 'nahi-tareekh' }, now).effective_from).toBeTruthy();
    expect(validateRateForm({ ...ok, effectiveFrom: '2020-01-01T00:00:00Z' }, now)).toEqual({});
  });
});

describe('toIsoOrUndefined', () => {
  it('khali ya ghalat undefined, sahi ISO', () => {
    expect(toIsoOrUndefined('')).toBeUndefined();
    expect(toIsoOrUndefined(undefined)).toBeUndefined();
    expect(toIsoOrUndefined('xyz')).toBeUndefined();
    expect(toIsoOrUndefined('2026-10-11T10:00')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('priceChange', () => {
  const history = [
    { fuel_type: 'petrol', rate: '270.00', effective_from: '2026-10-20T00:00:00Z' },
    { fuel_type: 'petrol', rate: '265.50', effective_from: '2026-10-10T00:00:00Z' },
    { fuel_type: 'petrol', rate: '262.00', effective_from: '2026-09-25T00:00:00Z' },
    { fuel_type: 'diesel', rate: '250.00', effective_from: '2026-10-01T00:00:00Z' },
  ];
  it('aanay wala (future) rate ginti mein nahi, farq maujooda aur pichle ka', () => {
    const change = priceChange(history, 'petrol', now);
    expect(change).toEqual({ from: '262.00', to: '265.50', diff: '3.50', up: true, same: false });
  });
  it('kam hua to up false, barabar to same true', () => {
    const down = priceChange([
      { fuel_type: 'diesel', rate: 240, effective_from: '2026-10-05T00:00:00Z' },
      { fuel_type: 'diesel', rate: 250, effective_from: '2026-09-05T00:00:00Z' },
    ], 'diesel', now);
    expect(down.diff).toBe('-10.00');
    expect(down.up).toBe(false);
    const same = priceChange([
      { fuel_type: 'diesel', rate: 250, effective_from: '2026-10-05T00:00:00Z' },
      { fuel_type: 'diesel', rate: 250, effective_from: '2026-09-05T00:00:00Z' },
    ], 'diesel', now);
    expect(same.same).toBe(true);
  });
  it('sirf ek rate ya koi nahi to null', () => {
    expect(priceChange(history, 'diesel', now)).toBeNull();
    expect(priceChange(history, 'hi_octane', now)).toBeNull();
    expect(priceChange([], 'petrol', now)).toBeNull();
  });
});