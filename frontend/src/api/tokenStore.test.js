import { describe, expect, it } from 'vitest';
import { createTokenStore, memoryStorage } from './tokenStore';

describe('tokenStore', () => {
  it('shuru mein khali hai', () => {
    const store = createTokenStore(memoryStorage());
    expect(store.access).toBeNull();
    expect(store.refresh).toBeNull();
  });

  it('set aur clear theek kaam karte hain', () => {
    const store = createTokenStore(memoryStorage());
    store.set('A1', 'R1');
    expect(store.access).toBe('A1');
    expect(store.refresh).toBe('R1');
    store.clear();
    expect(store.access).toBeNull();
    expect(store.refresh).toBeNull();
  });

  it('sirf access dene par purana refresh wahin rehta hai', () => {
    const store = createTokenStore(memoryStorage());
    store.set('A1', 'R1');
    store.set('A2');
    expect(store.access).toBe('A2');
    expect(store.refresh).toBe('R1');
  });

  it('khali ya None token store nahi hota', () => {
    const store = createTokenStore(memoryStorage());
    store.set('', null);
    expect(store.access).toBeNull();
    expect(store.refresh).toBeNull();
  });

  it('do alag store ek doosre ko nahi chhoote', () => {
    const first = createTokenStore(memoryStorage());
    const second = createTokenStore(memoryStorage());
    first.set('A', 'R');
    expect(second.access).toBeNull();
  });
});