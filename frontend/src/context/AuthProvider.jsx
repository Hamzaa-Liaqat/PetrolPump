import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMe, loginRequest, logoutRequest } from '@/api/auth';
import { AUTH_EXPIRED_EVENT } from '@/api/axios';
import { tokenStore } from '@/api/tokenStore';
import { AuthContext } from './AuthContext';

// status: 'loading' | 'authenticated' | 'anonymous' | 'unreachable'
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(
    tokenStore.access || tokenStore.refresh ? 'loading' : 'anonymous',
  );

  const expire = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Role/naam HAMESHA server (/auth/me/) se, token ke andar ke role se nahi.
  const refreshUser = useCallback(async () => {
    const { data } = await fetchMe();
    setUser(data);
    setStatus('authenticated');
    return data;
  }, []);

  const bootstrap = useCallback(async () => {
    if (!tokenStore.access && !tokenStore.refresh) {
      setStatus('anonymous');
      return;
    }
    setStatus('loading');
    try {
      await refreshUser();
    } catch (error) {
      if (error.response) expire();
      else setStatus('unreachable');
    }
  }, [refreshUser, expire]);

  useEffect(() => {
    if (!tokenStore.access && !tokenStore.refresh) return undefined;

    let cancelled = false;
    const loadUser = async () => {
      try {
        const { data } = await fetchMe();
        if (cancelled) return;
        setUser(data);
        setStatus('authenticated');
      } catch (error) {
        if (cancelled) return;
        if (error.response) expire();
        else setStatus('unreachable');
      }
    };
    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [expire]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expire);
  }, [expire]);

  // Tab dobara khulne par role/is_active dobara server se pooch lein.
  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUser().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [status, refreshUser]);

  const login = useCallback(async (username, password) => {
    const { data } = await loginRequest(username, password);
    tokenStore.set(data.access, data.refresh);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStore.refresh;
    try {
      if (refresh) await logoutRequest(refresh);
    } catch {
      // token pehle hi bekaar ho chuka ho to bhi local logout karna hai
    }
    expire();
  }, [expire]);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
      refreshUser,
      retry: bootstrap,
    }),
    [user, status, login, logout, refreshUser, bootstrap],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}