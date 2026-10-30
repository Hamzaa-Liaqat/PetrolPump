import { useEffect, useState } from 'react';
import { fetchHealth } from '@/api/auth';

// status: 'checking' | 'online' | 'degraded' (server chal raha, database nahi) | 'offline'
export function useServerStatus(intervalMs = 20000) {
  const [state, setState] = useState({ status: 'checking', database: null });

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const { data } = await fetchHealth();
        if (active) {
          setState({ status: data.database === 'ok' ? 'online' : 'degraded', database: data.database });
        }
      } catch {
        if (active) setState({ status: 'offline', database: null });
      }
    }

    check();
    const timer = setInterval(check, intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return state;
}