import { describe, expect, it } from 'vitest';
import { clearFlash, peekFlash, setFlash } from './flash';

function installFakeStorage() {
  const data = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

describe('flash', () => {
  it('storage na ho tab bhi crash nahi', () => {
    delete globalThis.sessionStorage;
    expect(peekFlash()).toBeNull();
    setFlash('x');
    clearFlash();
  });

  it('set, peek (hataye bagair), clear', () => {
    installFakeStorage();
    setFlash('Password badal gaya');
    expect(peekFlash()).toBe('Password badal gaya');
    expect(peekFlash()).toBe('Password badal gaya');
    clearFlash();
    expect(peekFlash()).toBeNull();
  });
});