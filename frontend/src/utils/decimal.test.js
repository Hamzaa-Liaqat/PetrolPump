import { describe, expect, it } from 'vitest';
import { formatHundredths, parseHundredths, sumHundredths } from './decimal';

describe('parseHundredths', () => {
  it('sahi numbers', () => {
    expect(parseHundredths('0')).toBe(0n);
    expect(parseHundredths('12')).toBe(1200n);
    expect(parseHundredths('12.5')).toBe(1250n);
    expect(parseHundredths('12.50')).toBe(1250n);
    expect(parseHundredths(1100.25)).toBe(110025n);
    expect(parseHundredths('  7.05 ')).toBe(705n);
  });

  it('ghalat cheezen null deti hain', () => {
    for (const bad of [null, undefined, '', 'abc', '1.234', '-5', '1,000', '1e3', '.5', '5.', 'NaN', '12 3']) {
      expect(parseHundredths(bad)).toBeNull();
    }
  });
});

describe('formatHundredths / sumHundredths', () => {
  it('wapas text mein', () => {
    expect(formatHundredths(0n)).toBe('0.00');
    expect(formatHundredths(5n)).toBe('0.05');
    expect(formatHundredths(110025n)).toBe('1100.25');
    expect(formatHundredths(-10000n)).toBe('-100.00');
  });

  it('0.1 + 0.2 bilkul 0.30 aata hai', () => {
    expect(formatHundredths(sumHundredths(['0.1', '0.2']))).toBe('0.30');
  });

  it('ghalat entries ko chhor kar jama karta hai', () => {
    expect(formatHundredths(sumHundredths(['10.00', 'x', null, 5.5]))).toBe('15.50');
    expect(formatHundredths(sumHundredths([]))).toBe('0.00');
  });
});