// Backend ke accounts.Profile.Role ki values se bilkul mel khani chahiye.
export const ROLES = Object.freeze({
  OWNER: 'owner',
  MANAGER: 'manager',
  CASHIER: 'cashier',
});

export const ROLE_LIST = Object.freeze(Object.values(ROLES));

export const ROLE_LABELS = Object.freeze({
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
});

// Har role ka apna rang, taake kahin bhi nazar aaye to pehchaan ho jaye.
export const ROLE_BADGE = Object.freeze({
  owner: 'bg-chip-lav text-chip-lav-ink',
  manager: 'bg-chip-blue text-chip-blue-ink',
  cashier: 'bg-chip-coral text-chip-coral-ink',
});