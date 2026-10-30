import { describe, expect, it } from 'vitest';
import { validateNewPassword, validateUsername } from './validators';

describe('validateUsername', () => {
  it('sahi usernames', () => {
    for (const ok of ['ali', 'ali.raza', 'a_b-c+d@e', 'Cashier1', '  ali  ']) expect(validateUsername(ok)).toBe('');
  });
  it('ghalat usernames', () => {
    for (const bad of ['', '   ', 'ali raza', 'ali/raza', 'ali!', 'a'.repeat(151), null, undefined]) {
      expect(validateUsername(bad)).not.toBe('');
    }
  });
});

describe('validateNewPassword', () => {
  it('sahi password', () => {
    expect(validateNewPassword('Brand#New2026!', 'ali')).toBe('');
  });
  it('khali, chhota, sirf digits', () => {
    expect(validateNewPassword('')).toContain('likhein');
    expect(validateNewPassword('Ab1!')).toContain('8');
    expect(validateNewPassword('12345678')).toContain('digits');
  });
  it('username password ke andar nahi (3 haroof ya zyada ke username par)', () => {
    expect(validateNewPassword('xxALIxx#99', 'ali')).toContain('username');
    expect(validateNewPassword('xxALIxx#99', 'al')).toBe('');
    expect(validateNewPassword('Brand#New2026!', '')).toBe('');
  });
});