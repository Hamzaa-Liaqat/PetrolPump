const cache = new Map();

function numberFormat(decimals) {
  if (!cache.has(decimals)) {
    // 'en-IN' = lakh/crore wali comma (12,34,567), jo Pakistan mein bhi chalti hai
    cache.set(decimals, new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }));
  }
  return cache.get(decimals);
}

export function toNumber(value) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

export const formatMoney = (value, decimals = 0) => `Rs ${numberFormat(decimals).format(toNumber(value))}`;
export const formatLitres = (value) => `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(toNumber(value))} L`;

export function percentOf(part, whole) {
  const total = toNumber(whole);
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((toNumber(part) / total) * 100)));
}

export function formatDateTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
}