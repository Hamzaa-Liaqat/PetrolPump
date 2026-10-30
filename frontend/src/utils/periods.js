const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// includeCurrent=false: sirf mukammal ho chuke mahine (salary ke liye).
export function monthOptions(count = 12, now = new Date(), { includeCurrent = true } = {}) {
  const options = [];
  const start = includeCurrent ? 0 : 1;
  for (let step = start; step < start + count; step += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - step, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    options.push({
      value: `${year}-${String(month).padStart(2, '0')}`,
      year,
      month,
      label: `${MONTHS[month - 1]} ${year}`,
    });
  }
  return options;
}

export function parseMonthValue(value) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? '');
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
}