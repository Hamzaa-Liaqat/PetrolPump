import { describe, expect, it } from 'vitest';
import { ALERT_LINKS, SEVERITY_STYLE } from './alerts';
import { EXPENSE_CATEGORIES, EXPENSE_LABELS } from './expenses';
import { FUEL_CHIP, FUEL_LABELS, FUEL_TYPES } from './fuel';
import { NAV_ITEMS } from './navigation';
import { ATTENDANCE_STATUSES, POSITIONS, POSITION_LABELS, SHIFTS, SHIFT_LABELS, STATUS_LABELS } from './staff';

const unique = (list) => new Set(list).size === list.length;

describe('choices (backend se mel aur yaksaniyat)', () => {
  it('expense categories: backend jaisi, unique, "salary" nahi, har ek ka label', () => {
    expect([...EXPENSE_CATEGORIES].sort()).toEqual(['electricity', 'maintenance', 'other', 'rent', 'repair', 'supplies', 'tax']);
    expect(unique(EXPENSE_CATEGORIES)).toBe(true);
    expect(EXPENSE_CATEGORIES).not.toContain('salary');
    for (const value of EXPENSE_CATEGORIES) expect(EXPENSE_LABELS[value]).toBeTruthy();
  });

  it('attendance statuses, shifts, positions backend jaise', () => {
    expect([...ATTENDANCE_STATUSES].sort()).toEqual(['absent', 'half_day', 'present']);
    expect([...SHIFTS].sort()).toEqual(['evening', 'morning', 'night']);
    expect([...POSITIONS].sort()).toEqual(['attendant', 'cashier', 'other']);
    for (const value of ATTENDANCE_STATUSES) expect(STATUS_LABELS[value]).toBeTruthy();
    for (const value of SHIFTS) expect(SHIFT_LABELS[value]).toBeTruthy();
    for (const value of POSITIONS) expect(POSITION_LABELS[value]).toBeTruthy();
  });

  it('fuel types ke labels aur rang maujood', () => {
    for (const value of FUEL_TYPES) {
      expect(FUEL_LABELS[value]).toBeTruthy();
      expect(FUEL_CHIP[value]).toBeTruthy();
    }
  });

  it('alert ke har link ka page menu mein maujood hai', () => {
    const paths = NAV_ITEMS.map((item) => item.path);
    for (const [type, path] of Object.entries(ALERT_LINKS)) {
      expect(paths).toContain(path);
      expect(type.length).toBeGreaterThan(0);
    }
  });

  it('teeno severity ka style hai', () => {
    for (const severity of ['critical', 'warning', 'info']) {
      expect(SEVERITY_STYLE[severity].dot).toBeTruthy();
      expect(SEVERITY_STYLE[severity].box).toBeTruthy();
    }
  });
});