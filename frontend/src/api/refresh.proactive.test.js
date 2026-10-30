import { describe, expect, it } from 'vitest';
import { createRefreshCoordinator, ensureFreshToken, needsProactiveRefresh } from './refresh';

const NOW = Date.parse('2026-10-28T10:00:00Z');
const b64 = (object) => btoa(JSON.stringify(object)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const token = (expInSeconds) => `${b64({ alg: 'HS256' })}.${b64({ exp: Math.floor(NOW / 1000) + expInSeconds })}.sig`;
const store = (access, refresh) => ({ access, refresh });

describe('needsProactiveRefresh', () => {
  it('taza token par nahi', () => {
    expect(needsProactiveRefresh({ url: 'tanks/', accessToken: token(600), hasRefreshToken: true, nowMs: NOW })).toBe(false);
  });
  it('khatam ya 30 second mein khatam hone wale token par haan', () => {
    expect(needsProactiveRefresh({ url: 'tanks/', accessToken: token(-5), hasRefreshToken: true, nowMs: NOW })).toBe(true);
    expect(needsProactiveRefresh({ url: 'tanks/', accessToken: token(20), hasRefreshToken: true, nowMs: NOW })).toBe(true);
    expect(needsProactiveRefresh({ url: 'tanks/', accessToken: token(40), hasRefreshToken: true, nowMs: NOW })).toBe(false);
  });
  it('access na ho magar refresh ho to haan; refresh na ho to nahi', () => {
    expect(needsProactiveRefresh({ url: 'tanks/', accessToken: null, hasRefreshToken: true, nowMs: NOW })).toBe(true);
    expect(needsProactiveRefresh({ url: 'tanks/', accessToken: token(-5), hasRefreshToken: false, nowMs: NOW })).toBe(false);
  });
  it('login/refresh ke apne raaste par kabhi nahi (infinite loop se bachao)', () => {
    expect(needsProactiveRefresh({ url: 'auth/login/', accessToken: token(-5), hasRefreshToken: true, nowMs: NOW })).toBe(false);
    expect(needsProactiveRefresh({ url: 'auth/refresh/', accessToken: token(-5), hasRefreshToken: true, nowMs: NOW })).toBe(false);
  });
  it('kharab token ko expired maanta hai', () => {
    expect(needsProactiveRefresh({ url: 'x/', accessToken: 'abc', hasRefreshToken: true, nowMs: NOW })).toBe(true);
  });
});

describe('ensureFreshToken', () => {
  it('taza token: refresh nahi, wohi token', async () => {
    let calls = 0;
    const t = token(600);
    const result = await ensureFreshToken({ url: 'tanks/', tokenStore: store(t, 'r'), refreshOnce: async () => { calls += 1; return 'new'; }, onExpired: () => {}, nowMs: NOW });
    expect(result).toBe(t);
    expect(calls).toBe(0);
  });

  it('purana token: pehle refresh, naya token wapas', async () => {
    let calls = 0;
    const result = await ensureFreshToken({ url: 'tanks/', tokenStore: store(token(-60), 'r'), refreshOnce: async () => { calls += 1; return 'NEW'; }, onExpired: () => {}, nowMs: NOW });
    expect(result).toBe('NEW');
    expect(calls).toBe(1);
  });

  it('network ki dikkat: logout nahi hota, purana token jata hai', async () => {
    let expired = 0;
    const old = token(-60);
    const result = await ensureFreshToken({
      url: 'tanks/', tokenStore: store(old, 'r'),
      refreshOnce: async () => { throw new Error('Network Error'); },
      onExpired: () => { expired += 1; }, nowMs: NOW,
    });
    expect(expired).toBe(0);
    expect(result).toBe(old);
  });

  it('refresh asli taur par rad (401): onExpired chalta hai', async () => {
    let expired = 0;
    const s = store(token(-60), 'r');
    await ensureFreshToken({
      url: 'tanks/', tokenStore: s,
      refreshOnce: async () => { const e = new Error('x'); e.response = { status: 401 }; throw e; },
      onExpired: () => { expired += 1; s.access = null; s.refresh = null; }, nowMs: NOW,
    });
    expect(expired).toBe(1);
  });

  it('5 requests ek saath: refresh sirf ek baar (rotation ke liye zaroori)', async () => {
    let refreshes = 0;
    const refreshOnce = createRefreshCoordinator(async () => {
      refreshes += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 'NEW';
    });
    const s = store(token(-60), 'r');
    const results = await Promise.all(
      ['tanks/', 'purchases/', 'auth/me/', 'alerts/', 'nozzles/'].map((url) =>
        ensureFreshToken({ url, tokenStore: s, refreshOnce, onExpired: () => {}, nowMs: NOW })),
    );
    expect(refreshes).toBe(1);
    expect(results).toEqual(['NEW', 'NEW', 'NEW', 'NEW', 'NEW']);
  });
});