import { describe, expect, it } from 'vitest';
import { createRefreshCoordinator, isDefinitiveAuthFailure, shouldAttemptRefresh } from './refresh';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('createRefreshCoordinator (single flight)', () => {
  it('10 ek saath maangne walon par refresh sirf ek baar chalta hai', async () => {
    let calls = 0;
    const refreshOnce = createRefreshCoordinator(async () => {
      calls += 1;
      await wait(20);
      return 'NEW-ACCESS';
    });
    const results = await Promise.all(Array.from({ length: 10 }, () => refreshOnce()));
    expect(calls).toBe(1);
    expect(results.every((value) => value === 'NEW-ACCESS')).toBe(true);
  });

  it('khatam hone ke baad agla refresh dobara chal sakta hai', async () => {
    let calls = 0;
    const refreshOnce = createRefreshCoordinator(async () => {
      calls += 1;
      return calls;
    });
    expect(await refreshOnce()).toBe(1);
    expect(await refreshOnce()).toBe(2);
  });

  it('nakami sab intezar karne walon ko milti hai, aur uske baad dobara koshish ho sakti hai', async () => {
    let calls = 0;
    const refreshOnce = createRefreshCoordinator(async () => {
      calls += 1;
      await wait(10);
      if (calls === 1) throw new Error('refresh rad');
      return 'OK';
    });
    const settled = await Promise.allSettled([refreshOnce(), refreshOnce(), refreshOnce()]);
    expect(calls).toBe(1);
    expect(settled.every((item) => item.status === 'rejected')).toBe(true);
    expect(await refreshOnce()).toBe('OK');
    expect(calls).toBe(2);
  });

  it('refreshFn ka sync error bhi promise ban kar aata hai (crash nahi)', async () => {
    const refreshOnce = createRefreshCoordinator(() => {
      throw new Error('foran phat gaya');
    });
    let message = '';
    try {
      await refreshOnce();
    } catch (error) {
      message = error.message;
    }
    expect(message).toBe('foran phat gaya');
  });
});

describe('shouldAttemptRefresh', () => {
  const base = { status: 401, url: 'dashboard/summary/', alreadyRetried: false, hasRefreshToken: true };

  it('aam 401 par refresh karta hai', () => {
    expect(shouldAttemptRefresh(base)).toBe(true);
  });

  it('401 ke ilawa kisi status par nahi', () => {
    for (const status of [200, 400, 403, 404, 429, 500, undefined]) {
      expect(shouldAttemptRefresh({ ...base, status })).toBe(false);
    }
  });

  it('dobara retry nahi (infinite loop se bachao)', () => {
    expect(shouldAttemptRefresh({ ...base, alreadyRetried: true })).toBe(false);
  });

  it('refresh token na ho to koshish nahi', () => {
    expect(shouldAttemptRefresh({ ...base, hasRefreshToken: false })).toBe(false);
  });

  it('login aur refresh ke apne URL par kabhi nahi', () => {
    expect(shouldAttemptRefresh({ ...base, url: 'auth/login/' })).toBe(false);
    expect(shouldAttemptRefresh({ ...base, url: 'auth/refresh/' })).toBe(false);
    expect(shouldAttemptRefresh({ ...base, url: '/api/auth/login/' })).toBe(false);
  });

  it('auth/me/ par refresh hota hai (wo login/refresh nahi)', () => {
    expect(shouldAttemptRefresh({ ...base, url: 'auth/me/' })).toBe(true);
  });

  it('url na ho to bhi crash nahi', () => {
    expect(shouldAttemptRefresh({ ...base, url: undefined })).toBe(true);
  });
});

describe('isDefinitiveAuthFailure', () => {
  it('400/401/403 asli rad hone ki nishani hain', () => {
    for (const status of [400, 401, 403]) {
      expect(isDefinitiveAuthFailure({ response: { status } })).toBe(true);
    }
  });

  it('network error ya server error par logout nahi', () => {
    expect(isDefinitiveAuthFailure(new Error('Network Error'))).toBe(false);
    expect(isDefinitiveAuthFailure({ response: { status: 500 } })).toBe(false);
    expect(isDefinitiveAuthFailure({ response: { status: 429 } })).toBe(false);
    expect(isDefinitiveAuthFailure(undefined)).toBe(false);
  });
});