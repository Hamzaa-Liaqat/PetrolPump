const KEY = 'fueltrack.flash';

export function setFlash(message) {
  try {
    sessionStorage.setItem(KEY, message);
  } catch {
    // storage band ho to paigham nahi dikhega, baqi sab theek
  }
}

export function peekFlash() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearFlash() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}