import { formatHundredths, parseHundredths } from './decimal';

// Backend (sales.models.FuelRate.clean) ke 7 din wale qaaide se mel.
export const MAX_FUTURE_DAYS = 7;

export function validateRateForm({ fuelType, rate, effectiveFrom }, now = new Date()) {
  const errors = {};
  if (!fuelType) errors.fuel_type = 'Fuel chunein.';
  const value = parseHundredths(rate);
  if (value === null || value <= 0n) errors.rate = 'Rate 0 se zyada number ho (zyada se zyada 2 decimal).';
  if (effectiveFrom) {
    const when = new Date(effectiveFrom);
    if (Number.isNaN(when.getTime())) errors.effective_from = 'Tareekh/waqt sahi nahi.';
    else if (when.getTime() > now.getTime() + MAX_FUTURE_DAYS * 86400000) {
      errors.effective_from = `Rate ${MAX_FUTURE_DAYS} din se zyada aage ka nahi ho sakta.`;
    }
  }
  return errors;
}

export function toIsoOrUndefined(localValue) {
  if (!localValue) return undefined;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

// Maujooda rate aur us se pichle rate ka farq (sirf wo rates jo lagu ho chuke hain).
export function priceChange(history, fuelType, now = new Date()) {
  const rows = history
    .filter((row) => row.fuel_type === fuelType && new Date(row.effective_from) <= now)
    .sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from));
  if (rows.length < 2) return null;
  const latest = parseHundredths(rows[0].rate);
  const previous = parseHundredths(rows[1].rate);
  if (latest === null || previous === null) return null;
  const diff = latest - previous;
  return { from: rows[1].rate, to: rows[0].rate, diff: formatHundredths(diff), up: diff > 0n, same: diff === 0n };
}