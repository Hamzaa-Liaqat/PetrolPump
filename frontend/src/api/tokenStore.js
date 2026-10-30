const ACCESS_KEY = 'fueltrack.access';
const REFRESH_KEY = 'fueltrack.refresh';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

export function createTokenStore(storage) {
  return {
    get access() {
      return storage.getItem(ACCESS_KEY);
    },
    get refresh() {
      return storage.getItem(REFRESH_KEY);
    },
    set(access, refresh) {
      if (access) storage.setItem(ACCESS_KEY, access);
      if (refresh) storage.setItem(REFRESH_KEY, refresh);
    },
    clear() {
      storage.removeItem(ACCESS_KEY);
      storage.removeItem(REFRESH_KEY);
    },
  };
}

const defaultStorage = typeof sessionStorage !== 'undefined' ? sessionStorage : memoryStorage();

export const tokenStore = createTokenStore(defaultStorage);
export { memoryStorage };