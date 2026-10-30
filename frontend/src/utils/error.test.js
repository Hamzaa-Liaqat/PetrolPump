import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './error';

const failure = (status, data) => ({ response: { status, data } });

describe('getErrorMessage', () => {
  it('network band ho (response nahi) to server wala paigham', () => {
    expect(getErrorMessage(new Error('Network Error'))).toContain('Server se rabta');
    expect(getErrorMessage(undefined)).toContain('Server se rabta');
  });

  it('status ke hisaab se sahi paigham', () => {
    expect(getErrorMessage(failure(401, {}))).toContain('Session khatam');
    expect(getErrorMessage(failure(403, {}))).toContain('ijazat');
    expect(getErrorMessage(failure(429, {}))).toContain('Bohat zyada');
    expect(getErrorMessage(failure(500, {}))).toContain('Server mein masla');
    expect(getErrorMessage(failure(503, null))).toContain('Server mein masla');
  });

  it('400 mein backend ka pehla paigham nikalta hai (kisi bhi gehrai se)', () => {
    expect(getErrorMessage(failure(400, { detail: 'Seedha paigham' }))).toBe('Seedha paigham');
    expect(getErrorMessage(failure(400, { password: ['Bohat chhota hai', 'Aam hai'] }))).toBe('Bohat chhota hai');
    expect(getErrorMessage(failure(400, { a: { b: [{ c: 'Gehra paigham' }] } }))).toBe('Gehra paigham');
  });

  it('paigham na mile to fallback', () => {
    expect(getErrorMessage(failure(400, {}), 'Mera fallback')).toBe('Mera fallback');
    expect(getErrorMessage(failure(400, { x: [] }))).toContain('Kuch ghalat');
    expect(getErrorMessage(failure(400, null))).toContain('Kuch ghalat');
  });
});