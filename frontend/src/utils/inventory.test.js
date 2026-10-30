import { describe, expect, it } from 'vitest';
import { previewVariance } from './inventory';

describe('previewVariance', () => {
  it('kam nikla: -100 L, -2.00%', () => {
    const result = previewVariance({ current: '5000', measured: '4900', capacity: '10000' });
    expect(result.ok).toBe(true);
    expect(result.variance).toBe('-100.00');
    expect(result.percent).toBe('-2.00');
  });

  it('zyada nikla', () => {
    const result = previewVariance({ current: '1000', measured: '1010.5', capacity: '10000' });
    expect(result.variance).toBe('10.50');
    expect(result.percent).toBe('1.05');
  });

  it('system stock 0 ho (opening stock) to percent nahi', () => {
    const result = previewVariance({ current: '0', measured: '6000', capacity: '10000' });
    expect(result.ok).toBe(true);
    expect(result.variance).toBe('6000.00');
    expect(result.percent).toBeNull();
  });

  it('capacity se zyada ya ghalat likha hua reject', () => {
    expect(previewVariance({ current: '5000', measured: '10001', capacity: '10000' }).ok).toBe(false);
    expect(previewVariance({ current: '5000', measured: 'abc', capacity: '10000' }).ok).toBe(false);
    expect(previewVariance({ current: '5000', measured: '', capacity: '10000' })).toEqual({ ok: false, error: '' });
  });
});