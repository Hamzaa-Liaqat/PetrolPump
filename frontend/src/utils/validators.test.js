import { describe, expect, it } from 'vitest';
import { validateEmail, validatePasswordChange, validatePhone } from './validators';

describe('validatePhone / validateEmail', () => {
  it('khali theek hai (optional)', () => {
    expect(validatePhone('')).toBe('');
    expect(validateEmail('')).toBe('');
  });

  it('phone ke qaaide backend jaise', () => {
    expect(validatePhone('03001234567')).toBe('');
    expect(validatePhone('+923001234567')).toBe('');
    expect(validatePhone('0300123')).not.toBe('');
    expect(validatePhone('abc12345678')).not.toBe('');
    expect(validatePhone('03001234567890123')).not.toBe('');
  });

  it('email', () => {
    expect(validateEmail('a@b.com')).toBe('');
    expect(validateEmail('a@b')).not.toBe('');
    expect(validateEmail('a b@c.com')).not.toBe('');
  });
});

describe('validatePasswordChange', () => {
  const ok = { oldPassword: 'Old#12345', newPassword: 'Brand#New2026!', confirmPassword: 'Brand#New2026!' };

  it('sahi form par koi ghalti nahi', () => {
    expect(validatePasswordChange(ok)).toEqual({});
  });

  it('har ghalti alag pakri jati hai', () => {
    expect(validatePasswordChange({ ...ok, oldPassword: '' }).oldPassword).toBeTruthy();
    expect(validatePasswordChange({ ...ok, newPassword: '', confirmPassword: '' }).newPassword).toBeTruthy();
    expect(validatePasswordChange({ ...ok, newPassword: 'short1', confirmPassword: 'short1' }).newPassword).toContain('8');
    expect(validatePasswordChange({ ...ok, newPassword: '12345678', confirmPassword: '12345678' }).newPassword).toContain('digits');
    expect(validatePasswordChange({ ...ok, newPassword: ok.oldPassword, confirmPassword: ok.oldPassword }).newPassword).toContain('alag');
    expect(validatePasswordChange({ ...ok, confirmPassword: 'Different#1' }).confirmPassword).toBeTruthy();
  });
});