import { formatHundredths, parseHundredths, sumHundredths } from './decimal';

// SIRF andaza dikhane ke liye. Asli litres/amount hamesha backend nikalta hai.
export function previewSale({ opening, closing, rate }) {
  const open = parseHundredths(opening);
  const price = parseHundredths(rate);
  if (open === null) return { ok: false, error: 'Opening reading sahi nahi.' };
  if (price === null || price <= 0n) return { ok: false, error: 'Is fuel ka rate set nahi.' };
  if (closing === '' || closing === null || closing === undefined) return { ok: false, error: '' };
  const close = parseHundredths(closing);
  if (close === null) {
    return { ok: false, error: 'Closing reading mein sirf number likhein (zyada se zyada 2 decimal).' };
  }
  if (close <= open) return { ok: false, error: 'Closing reading, opening reading se zyada honi chahiye.' };
  const litres = close - open;
  const amount = (litres * price + 50n) / 100n;
  return { ok: true, litres: formatHundredths(litres), amount: formatHundredths(amount), error: '' };
}

export function sumSales(sales) {
  return {
    litres: formatHundredths(sumHundredths(sales.map((sale) => sale.litres))),
    amount: formatHundredths(sumHundredths(sales.map((sale) => sale.amount))),
  };
}