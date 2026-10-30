const pad = (value) => String(value).padStart(2, '0');

// Browser ki LOCAL tareekh (toISOString UTC deta hai, jis se raat ko tareekh ek din peeche ho jati hai).
export function toISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysAgoISO(days, from = new Date()) {
  return toISODate(new Date(from.getFullYear(), from.getMonth(), from.getDate() - days));
}

export function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function monthRangeISO(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
}