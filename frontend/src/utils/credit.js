import { formatHundredths, parseHundredths } from './decimal';

export function filterCustomers(customers, search, { onlyDue = false } = {}) {
  const query = (search ?? '').trim().toLowerCase();
  return customers.filter((customer) => {
    if (onlyDue && !(Number(customer.balance) > 0)) return false;
    if (!query) return true;
    return customer.name.toLowerCase().includes(query) || String(customer.phone ?? '').includes(query);
  });
}

// SIRF andaza. Asli amount/limit ka faisla backend karta hai.
export function previewCreditSale({ litres, rate, balance, limit }) {
  if (litres === '' || litres === null || litres === undefined) return { ok: false, error: '' };
  const l = parseHundredths(litres);
  const price = parseHundredths(rate);
  if (price === null || price <= 0n) return { ok: false, error: 'Is fuel ka rate set nahi.' };
  if (l === null || l <= 0n) return { ok: false, error: 'Litres 0 se zyada number hon (zyada se zyada 2 decimal).' };
  const amount = (l * price + 50n) / 100n;
  const current = parseHundredths(balance) ?? 0n;
  const max = parseHundredths(limit) ?? 0n;
  const newBalance = current + amount;
  if (newBalance > max) {
    const available = max > current ? max - current : 0n;
    return {
      ok: false,
      error: `Credit limit se zyada: abhi sirf Rs ${formatHundredths(available)} ka udhaar baqi hai (is sale ki raqam Rs ${formatHundredths(amount)}).`,
    };
  }
  return { ok: true, error: '', amount: formatHundredths(amount), newBalance: formatHundredths(newBalance) };
}

export function previewPayment({ amount, balance }) {
  if (amount === '' || amount === null || amount === undefined) return { ok: false, error: '' };
  const value = parseHundredths(amount);
  if (value === null || value <= 0n) return { ok: false, error: 'Raqam 0 se zyada number ho (zyada se zyada 2 decimal).' };
  const current = parseHundredths(balance) ?? 0n;
  if (value > current) return { ok: false, error: `Payment baqi udhaar (Rs ${formatHundredths(current)}) se zyada nahi ho sakti.` };
  return { ok: true, error: '', newBalance: formatHundredths(current - value) };
}

// Statement mein kaun si entries pehle hi reverse ho chuki hain (isi list ke andar)
export function reversedIds(entries) {
  return new Set(entries.filter((entry) => entry.reversal_of).map((entry) => entry.reversal_of));
}