const AUTH_URL_PATTERN = /auth\/(login|refresh)\//;
import { isExpired } from '../utils/jwt';
// Ek waqt mein chahe 10 requests 401 khayein, refresh SIRF EK baar chalega.
// Backend rotation + blacklist lagata hai: ek hi refresh token dobara istemal
// hua to doosri call fail ho kar user ko logout kar degi. Yehi us ka ilaaj hai.
export function createRefreshCoordinator(refreshFn) {
  let inFlight = null;
  return function refreshOnce() {
    if (!inFlight) {
      inFlight = Promise.resolve()
        .then(refreshFn)
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  };
}

export function shouldAttemptRefresh({ status, url, alreadyRetried, hasRefreshToken }) {
  if (status !== 401) return false;
  if (alreadyRetried) return false;
  if (!hasRefreshToken) return false;
  if (AUTH_URL_PATTERN.test(url || '')) return false;
  return true;
}

// Refresh ka jawab kab "token asli taur par rad hua" samjha jaye (logout karo),
// aur kab sirf network ki dikkat hai (logout mat karo).
export function isDefinitiveAuthFailure(error) {
  const status = error?.response?.status;
  return status === 400 || status === 401 || status === 403;
}


// --- Request jane se PEHLE token ki expiry dekhna (taake console mein 401 na aaye) ---

// access token khatam (ya 30 second mein khatam hone wala) ho aur refresh token ho to pehle refresh.
export function needsProactiveRefresh({ url, accessToken, hasRefreshToken, nowMs = Date.now(), skewSeconds = 30 }) {
  if (!hasRefreshToken) return false;
  if (AUTH_URL_PATTERN.test(url || '')) return false;
  return isExpired(accessToken, skewSeconds, nowMs);
}

export async function ensureFreshToken({ url, tokenStore, refreshOnce, onExpired, nowMs = Date.now() }) {
  const access = tokenStore.access;
  const needs = needsProactiveRefresh({ url, accessToken: access, hasRefreshToken: Boolean(tokenStore.refresh), nowMs });
  if (!needs) return access;
  try {
    return await refreshOnce();
  } catch (error) {
    // network ki dikkat: logout nahi; asli rad hone par: logout. Request phir bhi jati hai, response wala raasta sambhal leta hai.
    if (isDefinitiveAuthFailure(error)) onExpired();
    return tokenStore.access;
  }
}