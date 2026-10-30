import axios from 'axios';
import { tokenStore } from './tokenStore';
import { createRefreshCoordinator, ensureFreshToken, isDefinitiveAuthFailure, shouldAttemptRefresh } from './refresh';

const rawUrl = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/';
// Aakhir mein '/' lazmi: warna 'api' + 'auth/login/' = 'apiauth/login/' ban jata hai.
export const API_URL = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;
export const AUTH_EXPIRED_EVENT = 'auth:expired';

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

const refreshAccessToken = createRefreshCoordinator(async () => {
  const { data } = await axios.post(
    `${API_URL}auth/refresh/`,
    { refresh: tokenStore.refresh },
    { timeout: 15000 },
  );
  tokenStore.set(data.access, data.refresh);
  return data.access;
});

function expireSession() {
  tokenStore.clear();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

// Request jane se PEHLE token ki expiry dekhta hai. Purana ho to pehle naya le leta hai,
// is liye server ko expired token nahi jata aur console mein 401 nahi aata.
api.interceptors.request.use(async (config) => {
  const token = await ensureFreshToken({
    url: config.url,
    tokenStore,
    refreshOnce: refreshAccessToken,
    onExpired: expireSession,
  });
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Phir bhi 401 aaye (jaise server ne token pehle hi rad kar diya) to purana tareeqa: ek baar refresh aur dobara.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (!original) return Promise.reject(error);

    const attempt = shouldAttemptRefresh({
      status: error.response?.status,
      url: original.url,
      alreadyRetried: original._retry,
      hasRefreshToken: Boolean(tokenStore.refresh),
    });
    if (!attempt) return Promise.reject(error);

    original._retry = true;
    try {
      const access = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch (refreshError) {
      if (isDefinitiveAuthFailure(refreshError)) expireSession();
      return Promise.reject(error);
    }
  },
);

export default api;