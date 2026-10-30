import { describe, expect, it } from 'vitest';
import { monthOptions, parseMonthValue } from './periods';

describe('monthOptions', () => {
  const now = new Date(2026, 9, 13);

  it('maujooda mahine se peeche ki taraf, saal paar karta hai', () => {
    const options = monthOptions(5, new Date(2026, 1, 10));
    expect(options.map((item) => item.value)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11', '2025-10']);
    expect(options[0].label).toBe('February 2026');
  });

  it('includeCurrent=false par maujooda mahina nahi', () => {
    const options = monthOptions(3, now, { includeCurrent: false });
    expect(options.map((item) => item.value)).toEqual(['2026-09', '2026-08', '2026-07']);
    expect(options[0]).toEqual({ value: '2026-09', year: 2026, month: 9, label: 'September 2026' });
  });

  it('value unique hain', () => {
    const values = monthOptions(24, now).map((item) => item.value);
    expect(new Set(values).size).toBe(24);
  });
});

describe('parseMonthValue', () => {
  it('sahi value', () => {
    expect(parseMonthValue('2026-09')).toEqual({ year: 2026, month: 9 });
  });
  it('ghalat value null', () => {
    for (const bad of ['2026-13', '2026-00', '2026-9', 'abc', '', null, undefined]) {
      expect(parseMonthValue(bad)).toBeNull();
    }
  });
});