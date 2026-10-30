// Har alert ki "type" kis page par le jati hai. Backend (reports.services.build_alerts) ki types.
export const ALERT_LINKS = Object.freeze({
  low_stock: '/tanks',
  missing_rate: '/rates',
  credit: '/credit',
  delivery_shortage: '/purchases',
  unmarked_attendance: '/staff',
  no_sales_today: '/billing',
});

export const SEVERITY_STYLE = Object.freeze({
  critical: { dot: 'bg-coral-500', box: 'bg-coral-100 text-coral-800' },
  warning: { dot: 'bg-warn', box: 'bg-warn-bg text-warn' },
  info: { dot: 'bg-periwinkle-500', box: 'bg-periwinkle-100 text-periwinkle-800' },
});