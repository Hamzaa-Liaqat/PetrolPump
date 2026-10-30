import { formatHundredths, parseHundredths } from './decimal';

// Dip check ka andaza: system stock aur naapa hua stock ka farq.
export function previewVariance({ current, measured, capacity }) {
  const now = parseHundredths(current);
  const dip = parseHundredths(measured);
  if (now === null) return { ok: false, error: 'System stock sahi nahi.' };
  if (measured === '' || measured === null || measured === undefined) return { ok: false, error: '' };
  if (dip === null) return { ok: false, error: 'Sirf number likhein (zyada se zyada 2 decimal).' };
  const max = parseHundredths(capacity);
  if (max !== null && dip > max) return { ok: false, error: 'Naapa hua stock tank ki capacity se zyada nahi ho sakta.' };
  const variance = dip - now;
  const percent = now > 0n ? ((Number(variance) / Number(now)) * 100).toFixed(2) : null;
  return { ok: true, variance: formatHundredths(variance), percent, error: '' };
}