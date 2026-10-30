import { ROLES } from './role';

const OWNER = Object.freeze([ROLES.OWNER]);
const OWNER_MANAGER = Object.freeze([ROLES.OWNER, ROLES.MANAGER]);
const EVERYONE = Object.freeze([ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER]);

// Backend ki ijazaton ka naqsha. Ye sirf buttons dikhane/chhupane ke liye hai;
// asli rok backend karta hai (Backend/.../petrolPump/test_permissions.py isi naqshe ko jaanchta hai).
export const PERMISSIONS = Object.freeze({
  'tank.create': OWNER,
  'tank.edit': OWNER,
  'tank.reconcile': OWNER_MANAGER,
  'nozzle.manage': OWNER,
  'purchase.create': OWNER_MANAGER,
  'sale.create': EVERYONE,
  'sale.void': OWNER_MANAGER,
  'credit.view': OWNER_MANAGER,
  'credit.limit.edit': OWNER,
  'credit.reverse': OWNER,
  'staff.manage': OWNER,
  'attendance.mark': OWNER_MANAGER,
  'attendance.delete': OWNER,
  'payslip.manage': OWNER,
  'expense.create': OWNER_MANAGER,
  'expense.void': OWNER,
  'rate.view': EVERYONE,
  'rate.create': OWNER,
  'report.view': OWNER_MANAGER,
  'alerts.view': OWNER_MANAGER,
  'user.manage': OWNER,
});

export function can(role, action) {
  const allowed = PERMISSIONS[action];
  return Boolean(allowed && allowed.includes(role));
}