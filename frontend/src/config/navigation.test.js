import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, canAccess, homePathFor, itemsForRole } from './navigation';
import { ROLES, ROLE_BADGE, ROLE_LABELS, ROLE_LIST } from './role';

describe('roles (backend se mel)', () => {
  it('backend ke teen roles hi hain', () => {
    // accounts.models.Profile.Role.values se mel khana chahiye
    expect([...ROLE_LIST].sort()).toEqual(['cashier', 'manager', 'owner']);
  });

  it('har role ka label aur badge maujood hai', () => {
    for (const role of ROLE_LIST) {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(ROLE_BADGE[role]).toBeTruthy();
    }
  });
});

describe('navigation (yaksaniyat aur uniqueness)', () => {
  it('har key unique hai', () => {
    const keys = NAV_ITEMS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('har path unique hai', () => {
    const paths = NAV_ITEMS.map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('har path "/" se shuru, chhote haroof, bina khali jagah ke', () => {
    for (const item of NAV_ITEMS) {
      expect(/^\/[a-z0-9-]+$/.test(item.path)).toBeTruthy();
    }
  });

  it('har label unique aur khali nahi', () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const label of labels) expect(label.trim().length).toBeGreaterThan(0);
  });

  it('har item mein sirf jaanay-pehchaane roles hain aur kam az kam ek', () => {
    for (const item of NAV_ITEMS) {
      expect(item.roles.length).toBeGreaterThan(0);
      for (const role of item.roles) expect(ROLE_LIST).toContain(role);
    }
  });

  it('har role ko menu mein kam az kam ek link milta hai', () => {
    for (const role of ROLE_LIST) {
      expect(itemsForRole(role).filter((item) => item.inNav).length).toBeGreaterThan(0);
    }
  });
});

describe('ijazat (backend ke qaaide ki jhalak)', () => {
  const keysFor = (role) => itemsForRole(role).map((item) => item.key);

  it('cashier sirf billing aur apna account dekhta hai', () => {
    expect(keysFor(ROLES.CASHIER).sort()).toEqual(['billing', 'profile']);
  });

  it('manager ko users ka page nahi milta', () => {
    expect(keysFor(ROLES.MANAGER)).not.toContain('users');
    expect(keysFor(ROLES.MANAGER)).toContain('reports');
  });

  it('owner ko sab kuch milta hai', () => {
    expect(keysFor(ROLES.OWNER)).toHaveLength(NAV_ITEMS.length);
  });

  it('anjaan role ko kuch nahi milta', () => {
    expect(itemsForRole('hacker')).toHaveLength(0);
    expect(itemsForRole(null)).toHaveLength(0);
    expect(itemsForRole(undefined)).toHaveLength(0);
    expect(canAccess('hacker', '/dashboard')).toBe(false);
  });

  it('canAccess: maujood aur ghair maujood path', () => {
    expect(canAccess(ROLES.CASHIER, '/billing')).toBe(true);
    expect(canAccess(ROLES.CASHIER, '/dashboard')).toBe(false);
    expect(canAccess(ROLES.OWNER, '/users')).toBe(true);
    expect(canAccess(ROLES.OWNER, '/nahi-hai')).toBe(false);
  });

  it('home path har role ke liye uska pehla ijazat wala page hai', () => {
    expect(homePathFor(ROLES.OWNER)).toBe('/dashboard');
    expect(homePathFor(ROLES.MANAGER)).toBe('/dashboard');
    expect(homePathFor(ROLES.CASHIER)).toBe('/billing');
    expect(canAccess(ROLES.CASHIER, homePathFor(ROLES.CASHIER))).toBe(true);
  });
});