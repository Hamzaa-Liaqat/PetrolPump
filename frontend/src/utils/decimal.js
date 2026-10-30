// Paison/litres ko float ke bajaye "sau-wein hisse" (BigInt) mein sambhalte hain,
// taake 0.1 + 0.2 jaisi ghaltiyan na hon. Backend bhi 2 decimal tak hi leta hai.
const PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

export function parseHundredths(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!PATTERN.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function formatHundredths(hundredths) {
  const negative = hundredths < 0n;
  const abs = negative ? -hundredths : hundredths;
  const whole = abs / 100n;
  const fraction = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function sumHundredths(values) {
  let total = 0n;
  for (const value of values) {
    const parsed = parseHundredths(value);
    if (parsed !== null) total += parsed;
  }
  return total;
}