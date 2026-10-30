import { describe, expect, it } from 'vitest';
import { previewSale, sumSales } from './billing';

describe('previewSale (backend ke hisaab se mel)', () => {
  it('seedha hisaab: 100 L x 250', () => {
    const result = previewSale({ opening: '1000', closing: '1100', rate: '250' });
    expect(result.ok).toBe(true);
    expect(result.litres).toBe('100.00');
    expect(result.amount).toBe('25000.00');
  });

  it('half-up rounding: 3.33 L x 258.45 = 860.64 (backend ke test jaisa)', () => {
    const result = previewSale({ opening: '1000', closing: '1003.33', rate: '258.45' });
    expect(result.amount).toBe('860.64');
  });

  it('bilkul beech ka round: 0.01 L x 0.50 = 0.01 (half-up)', () => {
    const result = previewSale({ opening: '5', closing: '5.01', rate: '0.5' });
    expect(result.amount).toBe('0.01');
  });

  it('numbers (text nahi) bhi chalte hain', () => {
    const result = previewSale({ opening: 1000, closing: '1050.5', rate: 250.5 });
    expect(result.litres).toBe('50.50');
    expect(result.amount).toBe('12650.25');
  });

  it('closing khali ho to ok nahi, magar koi ghalti ka paigham nahi', () => {
    expect(previewSale({ opening: '1000', closing: '', rate: '250' })).toEqual({ ok: false, error: '' });
  });

  it('closing <= opening par ghalti', () => {
    expect(previewSale({ opening: '1000', closing: '1000', rate: '250' }).ok).toBe(false);
    expect(previewSale({ opening: '1000', closing: '999.99', rate: '250' }).error).toContain('zyada honi chahiye');
  });

  it('3 decimal ya harf par ghalti', () => {
    expect(previewSale({ opening: '1000', closing: '1000.123', rate: '250' }).error).toContain('2 decimal');
    expect(previewSale({ opening: '1000', closing: 'abc', rate: '250' }).ok).toBe(false);
  });

  it('rate ya opening na ho to ghalti', () => {
    expect(previewSale({ opening: '1000', closing: '1100', rate: null }).error).toContain('rate');
    expect(previewSale({ opening: '1000', closing: '1100', rate: '0' }).ok).toBe(false);
    expect(previewSale({ opening: null, closing: '1100', rate: '250' }).ok).toBe(false);
  });
});

describe('sumSales', () => {
  it('server ke litres/amount ka jama (float ghalti ke bagair)', () => {
    const total = sumSales([
      { litres: 0.1, amount: 25.55 },
      { litres: '0.2', amount: '10.10' },
    ]);
    expect(total.litres).toBe('0.30');
    expect(total.amount).toBe('35.65');
  });

  it('khali list', () => {
    expect(sumSales([])).toEqual({ litres: '0.00', amount: '0.00' });
  });
});