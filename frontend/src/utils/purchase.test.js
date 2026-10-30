import { describe, expect, it } from 'vitest';
import { previewDelivery } from './purchases';

const base = { litres: '5000', invoiceAmount: '1500000', useDips: false, dipBefore: '', dipAfter: '', availableSpace: '10000' };

describe('previewDelivery', () => {
  it('dip ke bagair: received = invoice, cost per litre 300', () => {
    const result = previewDelivery(base);
    expect(result.ok).toBe(true);
    expect(result.received).toBe('5000.00');
    expect(result.shortage).toBe('0.00');
    expect(result.hasShortage).toBe(false);
    expect(result.costPerLitre).toBe('300.00');
  });

  it('dip ke saath: received = after - before, kami ka hisaab (backend ke test jaisa)', () => {
    const result = previewDelivery({ ...base, useDips: true, dipBefore: '1000', dipAfter: '5950' });
    expect(result.received).toBe('4950.00');
    expect(result.shortage).toBe('50.00');
    expect(result.shortagePercent).toBe('1.00');
    expect(result.hasShortage).toBe(true);
    expect(result.significant).toBe(true);
  });

  it('0.5% se kam kami "significant" nahi', () => {
    const result = previewDelivery({ ...base, useDips: true, dipBefore: '0', dipAfter: '4990' });
    expect(result.shortage).toBe('10.00');
    expect(result.significant).toBe(false);
  });

  it('zyada tel aaya to shortage minus', () => {
    const result = previewDelivery({ ...base, useDips: true, dipBefore: '0', dipAfter: '5010' });
    expect(result.shortage).toBe('-10.00');
    expect(result.hasShortage).toBe(false);
  });

  it('dip adhoori ya ulti ho to ok nahi', () => {
    expect(previewDelivery({ ...base, useDips: true, dipBefore: '1000' })).toEqual({ ok: false, error: '' });
    expect(previewDelivery({ ...base, useDips: true, dipBefore: '2000', dipAfter: '1000' }).error).toContain('zyada honi chahiye');
    expect(previewDelivery({ ...base, useDips: true, dipBefore: 'x', dipAfter: '1000' }).ok).toBe(false);
  });

  it('tank mein jagah se zyada tel reject', () => {
    const result = previewDelivery({ ...base, litres: '12000', availableSpace: '10000' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('10000.00 litre jagah');
  });

  it('litres khali ya ghalat', () => {
    expect(previewDelivery({ ...base, litres: '' })).toEqual({ ok: false, error: '' });
    expect(previewDelivery({ ...base, litres: '0' }).ok).toBe(false);
    expect(previewDelivery({ ...base, litres: '12.345' }).ok).toBe(false);
  });

  it('invoice raqam na ho to cost per litre null, baqi theek', () => {
    const result = previewDelivery({ ...base, invoiceAmount: '' });
    expect(result.ok).toBe(true);
    expect(result.costPerLitre).toBeNull();
  });

  it('cost per litre half-up (backend quantize jaisa)', () => {
    const result = previewDelivery({ ...base, litres: '3', invoiceAmount: '10' });
    expect(result.costPerLitre).toBe('3.33');
    expect(previewDelivery({ ...base, litres: '3', invoiceAmount: '10.01' }).costPerLitre).toBe('3.34');
  });
});