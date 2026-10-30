import { describe, expect, it } from 'vitest';
import { NOZZLE_NAME_MAX, buildCreatePayload, buildUpdatePayload, validateNozzleForm } from '../utils/nozzles';

const ok = { name: 'N1', tankId: '1', initialReading: '1000' };

describe('validateNozzleForm (naya nozzle)', () => {
  it('sahi form par koi ghalti nahi', () => {
    expect(validateNozzleForm(ok)).toEqual({});
    expect(validateNozzleForm({ ...ok, initialReading: '0' })).toEqual({});
    expect(validateNozzleForm({ ...ok, initialReading: '1500.25' })).toEqual({});
  });

  it('naam lazmi aur 30 haroof tak', () => {
    expect(validateNozzleForm({ ...ok, name: '' }).name).toBeTruthy();
    expect(validateNozzleForm({ ...ok, name: '   ' }).name).toBeTruthy();
    expect(validateNozzleForm({ ...ok, name: 'x'.repeat(NOZZLE_NAME_MAX) })).toEqual({});
    expect(validateNozzleForm({ ...ok, name: 'x'.repeat(NOZZLE_NAME_MAX + 1) }).name).toContain('30');
  });

  it('tank lazmi', () => {
    expect(validateNozzleForm({ ...ok, tankId: '' }).tank).toBeTruthy();
  });

  it('meter ki reading: number, 0 ya zyada, 2 decimal tak', () => {
    for (const bad of ['', 'abc', '-5', '12.345', null, undefined]) {
      expect(validateNozzleForm({ ...ok, initialReading: bad }).initial_reading).toBeTruthy();
    }
  });
});

describe('validateNozzleForm (edit)', () => {
  it('edit mein tank aur meter nahi parkhe jate, sirf naam', () => {
    expect(validateNozzleForm({ name: 'N2', tankId: '', initialReading: '' }, { editing: true })).toEqual({});
    expect(validateNozzleForm({ name: '', tankId: '', initialReading: '' }, { editing: true }).name).toBeTruthy();
  });
});

describe('payloads', () => {
  it('create: fuel tank se, meter text mein, naam trim', () => {
    const tank = { id: 2, fuel_type: 'diesel' };
    expect(buildCreatePayload({ name: '  N3 ', tank, initialReading: ' 1500.5 ' })).toEqual({
      name: 'N3', fuel_type: 'diesel', tank: 2, initial_reading: '1500.5',
    });
  });

  it('update: sirf naam aur is_active', () => {
    expect(buildUpdatePayload({ name: ' N1 ', isActive: false })).toEqual({ name: 'N1', is_active: false });
    expect(buildUpdatePayload({ name: 'N1', isActive: 1 })).toEqual({ name: 'N1', is_active: true });
  });
});