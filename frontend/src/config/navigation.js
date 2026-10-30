import { ROLES } from './role';

const ALL = Object.freeze([ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER]);
const MANAGEMENT = Object.freeze([ROLES.OWNER, ROLES.MANAGER]);
const OWNER_ONLY = Object.freeze([ROLES.OWNER]);

// Menu aur routes ka SIRF EK source. App.jsx isi list se routes banata hai,
// Navbar isi se links. Is liye menu mein link ho aur route na ho, ye mumkin nahi.
export const NAV_ITEMS = Object.freeze([
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', roles: MANAGEMENT, inNav: true },
  { key: 'billing', label: 'Billing', path: '/billing', roles: ALL, inNav: true },
  { key: 'tanks', label: 'Tanks', path: '/tanks', roles: MANAGEMENT, inNav: true },
  { key: 'purchases', label: 'Deliveries', path: '/purchases', roles: MANAGEMENT, inNav: true },
  { key: 'credit', label: 'Credit', path: '/credit', roles: MANAGEMENT, inNav: true },
  { key: 'staff', label: 'Staff', path: '/staff', roles: MANAGEMENT, inNav: true },
  { key: 'expenses', label: 'Expenses', path: '/expenses', roles: MANAGEMENT, inNav: true },
  { key: 'reports', label: 'Reports', path: '/reports', roles: MANAGEMENT, inNav: true },
  { key: 'rates', label: 'Fuel rates', path: '/rates', roles: MANAGEMENT, inNav: true },
  { key: 'users', label: 'Users', path: '/users', roles: OWNER_ONLY, inNav: true },
  { key: 'profile', label: 'My account', path: '/profile', roles: ALL, inNav: false },
]);

export function itemsForRole(role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function canAccess(role, path) {
  const item = NAV_ITEMS.find((candidate) => candidate.path === path);
  return Boolean(item && item.roles.includes(role));
}

export function homePathFor(role) {
  const first = itemsForRole(role).find((item) => item.inNav);
  return first ? first.path : '/profile';
}


export function titleFor(pathname) {
  const item = NAV_ITEMS.find((candidate) => candidate.path === pathname);
  return item ? `${item.label} - FuelTrack` : 'FuelTrack';
}