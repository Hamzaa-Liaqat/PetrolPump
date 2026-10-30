import { describe, expect, it } from 'vitest';
import { Buffer } from 'node:buffer';
import { decodeJwt, isExpired } from './jwt';

function makeToken(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('decodeJwt', () => {
  it('sahi token ka payload deta hai', () => {
    const payload = decodeJwt(makeToken({ role: 'owner', exp: 123 }));
    expect(payload.role).toBe('owner');
  });

  it('urdu/unicode wala naam bhi sahi parhta hai', () => {
    expect(decodeJwt(makeToken({ username: 'عمر' })).username).toBe('عمر');
  });

  it('kharab cheezon par crash nahi, null deta hai', () => {
    for (const bad of [null, undefined, 123, '', 'abc', 'a.b', 'a.b.c.d', 'a.!!!.c', {}]) {
      expect(decodeJwt(bad)).toBeNull();
    }
  });

  it('payload object na ho (list/number) to null', () => {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    expect(decodeJwt(`x.${encode([1, 2])}.y`)).toBeNull();
    expect(decodeJwt(`x.${encode(42)}.y`)).toBeNull();
  });
});

describe('isExpired', () => {
  const now = 1_700_000_000_000;
  const at = (secondsFromNow) => makeToken({ exp: Math.floor(now / 1000) + secondsFromNow });

  it('abhi expire nahi', () => {
    expect(isExpired(at(600), 10, now)).toBe(false);
  });

  it('guzar chuka token expired hai', () => {
    expect(isExpired(at(-1), 10, now)).toBe(true);
  });

  it('expiry se pehle ka "skew" bhi expired ginta hai', () => {
    expect(isExpired(at(5), 10, now)).toBe(true);
    expect(isExpired(at(30), 10, now)).toBe(false);
  });

  it('exp ke bagair ya kharab token expired maana jata hai', () => {
    expect(isExpired(makeToken({ role: 'owner' }), 10, now)).toBe(true);
    expect(isExpired('garbage', 10, now)).toBe(true);
    expect(isExpired(null, 10, now)).toBe(true);
  });
});