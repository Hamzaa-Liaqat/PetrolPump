import { describe, expect, it } from 'vitest';
import { filterCustomers, previewCreditSale, previewPayment, reversedIds } from './credit';

const customers = [
  { id: 1, name: 'Ali Traders', phone: '03001234567', balance: 6000 },
  { id: 2, name: 'Bilal Goods', phone: '03211234567', balance: 0 },
  { id: 3, name: 'Hamza Transport', phone: '03331234567', balance: '2500.50' },
];

describe('filterCustomers (client-side search)', () => {
  it('naam ya phone se, chhote bare haroof ka farq nahi', () => {
    expect(filterCustomers(customers, 'ali').map((c) => c.id)).toEqual([1]);
    expect(filterCustomers(customers, '  GOODS ').map((c) => c.id)).toEqual([2]);
    expect(filterCustomers(customers, '0333').map((c) => c.id)).toEqual([3]);
  });
  it('khali search sab deta hai, koi match nahi to khali', () => {
    expect(filterCustomers(customers, '')).toHaveLength(3);
    expect(filterCustomers(customers, 'zzz')).toHaveLength(0);
  });
  it('sirf udhaar wale', () => {
    expect(filterCustomers(customers, '', { onlyDue: true }).map((c) => c.id)).toEqual([1, 3]);
    expect(filterCustomers(customers, 'bilal', { onlyDue: true })).toHaveLength(0);
  });
  it('phone na ho to crash nahi', () => {
    expect(filterCustomers([{ id: 9, name: 'X', balance: 0 }], '03')).toHaveLength(0);
  });
});

describe('previewCreditSale', () => {
  const base = { litres: '100', rate: '250', balance: '0', limit: '100000' };

  it('amount aur naya balance', () => {
    const result = previewCreditSale(base);
    expect(result.ok).toBe(true);
    expect(result.amount).toBe('25000.00');
    expect(result.newBalance).toBe('25000.00');
  });

  it('half-up rounding backend jaisa', () => {
    expect(previewCreditSale({ ...base, litres: '3.33', rate: '258.45' }).amount).toBe('860.64');
  });

  it('limit se zyada ho to ok nahi aur kitna baqi hai batata hai', () => {
    const result = previewCreditSale({ ...base, balance: '90000', limit: '100000' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('10000.00');
    expect(result.error).toContain('25000.00');
  });

  it('limit ke bilkul barabar chalta hai', () => {
    expect(previewCreditSale({ ...base, limit: '25000' }).ok).toBe(true);
    expect(previewCreditSale({ ...base, limit: '24999.99' }).ok).toBe(false);
  });

  it('limit 0 par kuch nahi, aur limit se zyada balance par available 0', () => {
    expect(previewCreditSale({ ...base, limit: '0' }).ok).toBe(false);
    expect(previewCreditSale({ ...base, balance: '5000', limit: '1000' }).error).toContain('Rs 0.00');
  });

  it('rate/litres ghalat', () => {
    expect(previewCreditSale({ ...base, litres: '' })).toEqual({ ok: false, error: '' });
    expect(previewCreditSale({ ...base, litres: '0' }).ok).toBe(false);
    expect(previewCreditSale({ ...base, rate: null }).error).toContain('rate');
  });
});

describe('previewPayment', () => {
  it('sahi payment', () => {
    expect(previewPayment({ amount: '1000', balance: '6000' })).toEqual({ ok: true, error: '', newBalance: '5000.00' });
  });
  it('poora baqi chalta hai, zyada nahi', () => {
    expect(previewPayment({ amount: '6000', balance: '6000' }).ok).toBe(true);
    expect(previewPayment({ amount: '6000.01', balance: '6000' }).ok).toBe(false);
  });
  it('khali/0/ghalat', () => {
    expect(previewPayment({ amount: '', balance: '10' })).toEqual({ ok: false, error: '' });
    expect(previewPayment({ amount: '0', balance: '10' }).ok).toBe(false);
    expect(previewPayment({ amount: 'x', balance: '10' }).ok).toBe(false);
  });
});

describe('reversedIds', () => {
  it('reversal_of wali entries se reverse ho chuki ids', () => {
    const set = reversedIds([{ id: 5, reversal_of: null }, { id: 6, reversal_of: 5 }]);
    expect(set.has(5)).toBe(true);
    expect(set.has(6)).toBe(false);
  });
});