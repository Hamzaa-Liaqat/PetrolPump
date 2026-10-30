import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from './navigation';
import { PERMISSIONS, can } from './permissions';
import { ROLES, ROLE_LIST } from './role';

describe('permissions', () => {
  it('har action mein sirf jaanay-pehchaane roles, kam az kam ek, aur owner hamesha shamil', () => {
    for (const [action, roles] of Object.entries(PERMISSIONS)) {
      expect(roles.length).toBeGreaterThan(0);
      for (const role of roles) expect(ROLE_LIST).toContain(role);
      expect(roles).toContain(ROLES.OWNER);
      expect(/^[a-z]+(\.[a-z]+)+$/.test(action)).toBeTruthy();
    }
  });

  it('actions ke naam unique', () => {
    const names = Object.keys(PERMISSIONS);
    expect(new Set(names).size).toBe(names.length);
  });

  it('can(): anjaan action/role par false', () => {
    expect(can('owner', 'koi.nahi')).toBe(false);
    expect(can('hacker', 'tank.create')).toBe(false);
    expect(can(null, 'tank.create')).toBe(false);
    expect(can(undefined, undefined)).toBe(false);
  });

  it('cashier sirf sale darj kar sakta aur rate dekh sakta hai', () => {
    const allowed = Object.keys(PERMISSIONS).filter((action) => can(ROLES.CASHIER, action)).sort();
    expect(allowed).toEqual(['rate.view', 'sale.create']);
  });

  it('manager owner ke khaas kaam nahi kar sakta', () => {
    for (const action of ['tank.create', 'tank.edit','nozzle.manage', 'credit.limit.edit', 'credit.reverse', 'staff.manage',
      'attendance.delete', 'payslip.manage', 'expense.void', 'rate.create', 'user.manage']) {
      expect(can(ROLES.MANAGER, action)).toBe(false);
    }
    for (const action of ['tank.reconcile', 'purchase.create', 'sale.void', 'attendance.mark', 'expense.create', 'report.view']) {
      expect(can(ROLES.MANAGER, action)).toBe(true);
    }
  });

  it('pages ki ijazat (menu) aur actions ki ijazat ek jaisi', () => {
    const pageRoles = (key) => NAV_ITEMS.find((item) => item.key === key).roles;
    const pairs = [
      ['users', 'user.manage'],
      ['reports', 'report.view'],
      ['credit', 'credit.view'],
      ['staff', 'attendance.mark'],
      ['expenses', 'expense.create'],
      ['tanks', 'tank.reconcile'],
      ['purchases', 'purchase.create'],
      ['billing', 'sale.create'],
    ];
    for (const [page, action] of pairs) {
      expect([...pageRoles(page)].sort()).toEqual([...PERMISSIONS[action]].sort());
    }
  });
});